import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MODEL = "google/gemini-2.5-flash";

const SYSTEM_PROMPT = `You are "Gladius Coach AI" — an expert combat-sports coaching assistant who drafts coach session notes for MMA, Muay Thai, K1, Boxing, Wrestling, BJJ and Grappling.

You ALWAYS reply by calling the draft_coach_note tool. Never reply with prose.

DISCIPLINE RULES:
- MMA: striking + wrestling + grappling + BJJ all allowed.
- K1 / Muay Thai: striking & clinch only — NO ground/BJJ. Tactic CANNOT be "Control".
- BJJ / Grappling: ground positions, transitions, submissions — NO striking.
- Wrestling: takedowns, scrambles, control — NO submissions/striking.

TACTIC must be exactly one of: Attacking, Defending, Countering, Intercepting, Transition, Control.

For "class_plan" notes: fill title, session_plan (warm-up → drills → main work → sparring/cooldown), drills, duration_minutes (30–120), target_group, notes (private coach observations / cues), tags.
For "technical_note": fill title, technique, tactic, first_movement (my action), opponent_action (their reaction), second_movement (my follow-up), notes (cues, common mistakes), tags.

Be specific, tactical, fighter-friendly. No generic filler.`;

const DRAFT_TOOL = {
  type: "function",
  function: {
    name: "draft_coach_note",
    description: "Draft a complete coach session note (class plan or technical note).",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        discipline: { type: "string", enum: ["MMA", "Muay Thai", "K1", "Wrestling", "BJJ", "Grappling", "General"] },
        // class plan
        session_plan: { type: "string" },
        drills: { type: "string" },
        duration_minutes: { type: "number" },
        target_group: { type: "string", enum: ["all_students", "beginners", "intermediate", "advanced", "fighters"] },
        // technical note
        technique: { type: "string" },
        tactic: { type: "string", enum: ["Attacking", "Defending", "Countering", "Intercepting", "Transition", "Control"] },
        first_movement: { type: "string" },
        opponent_action: { type: "string" },
        second_movement: { type: "string" },
        target_level: { type: "string", enum: ["All Levels", "Beginner", "Intermediate", "Advanced", "Fighter"] },
        // shared
        notes: { type: "string" },
        tags: { type: "array", items: { type: "string" } },
      },
      required: ["title", "discipline", "notes", "tags"],
      additionalProperties: false,
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing authorization" }, 401);

    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) return json({ error: "AI gateway not configured" }, 500);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Not authenticated" }, 401);
    const userId = userData.user.id;

    // Pro-only
    const { data: isPro } = await supabase.rpc("is_pro_user", { _user_id: userId });
    if (!isPro) return json({ error: "Pro subscription required to use the Coach AI." }, 403);

    // Must be a coach
    const { data: profile } = await supabase
      .from("profiles")
      .select("coach_level")
      .eq("id", userId)
      .maybeSingle();
    if (!profile?.coach_level) return json({ error: "Coach role required." }, 403);

    const { noteType, discipline, prompt, current } = await req.json();
    if (!prompt || typeof prompt !== "string") return json({ error: "Prompt required" }, 400);

    const userMessage = `Note type: ${noteType === "technical_note" ? "technical_note" : "class_plan"}
Discipline: ${discipline || "MMA"}
Coach intent: ${prompt}

Existing fields (may be empty — fill missing, refine present):
${JSON.stringify(current || {}, null, 2)}

Draft the complete note now by calling draft_coach_note.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
        tools: [DRAFT_TOOL],
        tool_choice: { type: "function", function: { name: "draft_coach_note" } },
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI gateway error", aiResp.status, t);
      if (aiResp.status === 429) return json({ error: "Rate limit reached. Please wait and try again." }, 429);
      if (aiResp.status === 402) return json({ error: "AI credits exhausted. Add credits in Settings → Workspace → Usage." }, 402);
      return json({ error: "AI gateway error" }, 500);
    }

    const data = await aiResp.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) return json({ error: "AI did not return a draft" }, 500);

    let draft: Record<string, unknown> = {};
    try {
      draft = JSON.parse(toolCall.function.arguments);
    } catch {
      return json({ error: "Failed to parse AI draft" }, 500);
    }

    // Enforce K1 cannot use Control
    if (draft.discipline === "K1" && draft.tactic === "Control") {
      draft.tactic = "Attacking";
    }

    return json({ draft });
  } catch (e) {
    console.error("ai-coach-note-draft error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
