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

    const body = await req.json();
    // Support token in body (accessToken) to bypass gateway ES256 rejection,
    // with fallback to Authorization header for backwards compatibility
    const authHeader = req.headers.get("Authorization");
    const token = body.accessToken || (authHeader ? authHeader.replace("Bearer ", "") : null);
    if (!token) {
      return new Response(JSON.stringify({ error: "Non authentifié" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: { user: caller }, error: authError } = await adminClient.auth.getUser(token);
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: "Non authentifié" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get caller's profile (role + team)
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

    const { userId, firstName, lastName, phone, matricule, email, role, teamId, isApproved, password } = body;

    if (!userId) {
      return new Response(JSON.stringify({ error: "userId manquant" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get target profile to verify manager has access
    const { data: targetProfile } = await adminClient
      .from("profiles")
      .select("user_id, team_id, role")
      .eq("user_id", userId)
      .single();

    if (!targetProfile) {
      return new Response(JSON.stringify({ error: "Utilisateur introuvable" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Manager: can only update agents in their own team
    if (callerProfile.role === "manager") {
      if (targetProfile.team_id !== callerProfile.team_id) {
        return new Response(JSON.stringify({ error: "Accès refusé — hors équipe" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Manager cannot change email/password for other managers or admins
      if (targetProfile.role !== "agent" && (email || password)) {
        return new Response(JSON.stringify({ error: "Accès refusé — email/mot de passe réservé aux agents" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Build profile update payload
    const profileUpdate: Record<string, unknown> = {};
    if (firstName !== undefined) profileUpdate.first_name  = firstName;
    if (lastName  !== undefined) profileUpdate.last_name   = lastName;
    if (phone     !== undefined) profileUpdate.phone_number = phone || null;
    if (matricule !== undefined) profileUpdate.matricule   = matricule || null;

    // Admin-only fields
    if (callerProfile.role === "admin") {
      if (role        !== undefined) profileUpdate.role       = role;
      if (teamId      !== undefined) profileUpdate.team_id    = teamId || null;
      if (isApproved  !== undefined) profileUpdate.is_approved = isApproved;
    }

    if (Object.keys(profileUpdate).length > 0) {
      const { error: updateError } = await adminClient
        .from("profiles")
        .update(profileUpdate)
        .eq("user_id", userId);

      if (updateError) {
        return new Response(JSON.stringify({ error: updateError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Update email and/or password in auth.users if provided
    const authUpdate: Record<string, string> = {};
    if (email && email.trim()) authUpdate.email = email.trim();
    if (password && password.length >= 6) authUpdate.password = password;

    if (Object.keys(authUpdate).length > 0) {
      const { error: authError } = await adminClient.auth.admin.updateUserById(userId, authUpdate);
      if (authError) {
        return new Response(JSON.stringify({ error: authError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
