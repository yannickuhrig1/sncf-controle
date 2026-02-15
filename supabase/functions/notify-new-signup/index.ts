import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Web Push helpers
function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const padding = '='.repeat((4 - base64Url.length % 4) % 4);
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function importVapidKey(privateKeyBase64Url: string): Promise<CryptoKey> {
  const rawKey = base64UrlToUint8Array(privateKeyBase64Url);
  return await crypto.subtle.importKey(
    "jwk",
    {
      kty: "EC",
      crv: "P-256",
      d: privateKeyBase64Url,
      x: "", // Will be derived
      y: "",
    },
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign"]
  );
}

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

    // Get push subscriptions for admins/managers
    const adminUserIds = adminsAndManagers.map(a => a.user_id);
    const { data: subscriptions } = await adminClient
      .from("push_subscriptions")
      .select("*")
      .in("user_id", adminUserIds);

    let pushSent = 0;
    
    if (subscriptions && subscriptions.length > 0) {
      const payload = JSON.stringify({
        title: "Nouvelle inscription",
        body: `${user_name} (${user_email}) attend validation`,
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        data: { url: "/admin" },
      });

      // Try sending push notifications via simple fetch to each endpoint
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
            // Subscription expired, clean it up
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

    console.log(`New signup: ${user_name} (${user_email}) - ${pushSent} push sent, ${adminsAndManagers.length} admins notified`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        notified: adminsAndManagers.length,
        pushSent,
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
