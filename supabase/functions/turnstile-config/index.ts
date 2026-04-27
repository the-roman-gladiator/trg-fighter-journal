import { corsHeaders } from "@supabase/supabase-js/cors";

Deno.serve((req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  const siteKey = Deno.env.get("TURNSTILE_SITE_KEY") ?? "";
  return new Response(JSON.stringify({ siteKey }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
