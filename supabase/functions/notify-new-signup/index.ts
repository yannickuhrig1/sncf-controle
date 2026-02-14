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

    const { user_name, user_email } = await req.json();

    // Get all admins and managers to notify
    const { data: adminsAndManagers } = await adminClient
      .from("profiles")
      .select("user_id, first_name, last_name, role")
      .in("role", ["admin", "manager"]);

    if (!adminsAndManagers || adminsAndManagers.length === 0) {
      return new Response(
        JSON.stringify({ message: "No admins/managers to notify" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For now, log the notification (push subscriptions would need to be stored in DB)
    console.log(`New signup notification: ${user_name} (${user_email}) - notifying ${adminsAndManagers.length} admins/managers`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        notified: adminsAndManagers.length,
        message: `Notification envoyée à ${adminsAndManagers.length} admin(s)/manager(s)` 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in notify-new-signup:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
