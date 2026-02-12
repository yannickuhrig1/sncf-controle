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

    // Use service role to verify caller identity and check role
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non authentifié" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role client to verify the JWT and get user
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    
    // Extract the token and get user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: authError } = await adminClient.auth.getUser(token);
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: "Non authentifié" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check role using service role client (bypasses RLS)
    const { data: callerProfile } = await adminClient
      .from("profiles")
      .select("role, team_id")
      .eq("user_id", caller.id)
      .single();

    if (!callerProfile || (callerProfile.role !== "admin" && callerProfile.role !== "manager")) {
      return new Response(JSON.stringify({ error: "Accès refusé" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, password, first_name, last_name, phone_number, team_id } = await req.json();

    if (!email || !password || !first_name || !last_name) {
      return new Response(JSON.stringify({ error: "Champs obligatoires manquants" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Managers can only create agents in their own team
    const assignedTeamId = callerProfile.role === "manager" ? callerProfile.team_id : (team_id || null);

    // Create user with admin client (reuse existing adminClient)
    
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { first_name, last_name, phone_number },
    });

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update the profile with team assignment (profile is auto-created by trigger)
    if (assignedTeamId && newUser.user) {
      // Wait briefly for the trigger to create the profile
      await new Promise((r) => setTimeout(r, 500));
      
      await adminClient
        .from("profiles")
        .update({ team_id: assignedTeamId })
        .eq("user_id", newUser.user.id);
    }

    return new Response(
      JSON.stringify({ success: true, user_id: newUser.user?.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
