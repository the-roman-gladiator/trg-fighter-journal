import { corsHeaders } from "@supabase/supabase-js/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { token } = await req.json();
    if (!token || typeof token !== "string" || token.length > 4096) {
      return new Response(
        JSON.stringify({ success: false, error: "missing_token" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const secret = Deno.env.get("TURNSTILE_SECRET_KEY");
    if (!secret) {
      return new Response(
        JSON.stringify({ success: false, error: "server_misconfigured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ip =
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "";

    const form = new URLSearchParams();
    form.append("secret", secret);
    form.append("response", token);
    if (ip) form.append("remoteip", ip);

    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      { method: "POST", body: form }
    );
    const data = await res.json();

    return new Response(
      JSON.stringify({ success: !!data.success, errors: data["error-codes"] ?? [] }),
      {
        status: data.success ? 200 : 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ success: false, error: "invalid_request" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
