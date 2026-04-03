import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { request_id, team_id, requester_id, requester_name, team_name } = await req.json();

    // Get team manager
    const { data: team } = await adminClient
      .from("teams")
      .select("manager_id, co_manager_ids")
      .eq("id", team_id)
      .single();

    // Get all admins
    const { data: admins } = await adminClient
      .from("profiles")
      .select("user_id")
      .eq("role", "admin");

    // Build list of user_ids to notify: team manager + co-managers + all admins
    const notifyUserIds = new Set<string>();
    if (team?.manager_id) notifyUserIds.add(team.manager_id);
    if (team?.co_manager_ids) {
      for (const id of team.co_manager_ids) notifyUserIds.add(id);
    }
    if (admins) {
      for (const a of admins) notifyUserIds.add(a.user_id);
    }
    // Don't notify the requester themselves
    notifyUserIds.delete(requester_id);

    if (notifyUserIds.size === 0) {
      return new Response(
        JSON.stringify({ message: "No users to notify" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get push subscriptions
    const { data: subscriptions } = await adminClient
      .from("push_subscriptions")
      .select("*")
      .in("user_id", Array.from(notifyUserIds));

    let pushSent = 0;

    if (subscriptions && subscriptions.length > 0) {
      const payload = JSON.stringify({
        title: "Demande de rejoindre une équipe",
        body: `${requester_name} souhaite rejoindre l'équipe "${team_name}"`,
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        data: { url: "/manager" },
      });

      for (const sub of subscriptions) {
        try {
          const response = await fetch(sub.endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "TTL": "86400",
            },
            body: payload,
          });

          if (response.ok || response.status === 201) {
            pushSent++;
          } else if (response.status === 410 || response.status === 404) {
            await adminClient
              .from("push_subscriptions")
              .delete()
              .eq("id", sub.id);
          }
        } catch (pushError) {
          console.error("Push send error:", pushError);
        }
      }
    }

    console.log(`Join request ${request_id}: ${requester_name} -> ${team_name} - ${pushSent} push sent`);

    return new Response(
      JSON.stringify({
        success: true,
        notified: notifyUserIds.size,
        pushSent,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in notify-team-join-request:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
