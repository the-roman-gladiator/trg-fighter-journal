import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are "Fighter Pathway AI", an expert combat-sports coach assistant for MMA, Muay Thai, K1, Wrestling, BJJ, and Grappling.

You help fighters and coaches by:
1. Analysing free-form training notes and converting them into a structured technical breakdown.
2. Answering questions about combos, counters, defence, attacking, grappling transitions, wrestling entries, BJJ positions, MMA strategy, fight tactics, and training improvement.

Speak in clear, simple, fighter-friendly language. Be specific and tactical. Avoid generic advice.

DISCIPLINE RULES (enforce when generating neural pathways):
- MMA: striking, wrestling, grappling, BJJ all allowed.
- K1 / Muay Thai: striking and clinch only — NO ground or BJJ branches.
- BJJ: ground positions, submissions, sweeps, transitions — NO striking branches.
- Wrestling: takedowns, control, scrambles — NO submissions/striking unless MMA mode.
- Grappling: positions, transitions, submissions — NO striking.

When the user asks for ANALYSIS of a training note, you MUST call the analyse_training_note tool.
When the user asks a general question, respond conversationally with markdown.`;

const ANALYSE_TOOL = {
  type: "function",
  function: {
    name: "analyse_training_note",
    description:
      "Analyse a fighter training note and return a structured technical breakdown with neural pathway logic.",
    parameters: {
      type: "object",
      properties: {
        discipline: {
          type: "string",
          enum: ["MMA", "Muay Thai", "K1", "Wrestling", "BJJ", "Grappling"],
        },
        tactic: {
          type: "string",
          description:
            "Tactical category: Attacking, Defending, Countering, Intercepting, Transitions, or Control.",
        },
        technique: {
          type: "string",
          description: "The primary technique demonstrated.",
        },
        movement_1: {
          type: "string",
          description: "How did the fighter start? First movement / setup.",
        },
        movement_2: {
          type: "string",
          description: "Opponent's reaction.",
        },
        movement_3: {
          type: "string",
          description: "What did the fighter capitalize with? Finish / follow-up.",
        },
        neural_nodes: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "number" },
              label: { type: "string" },
              type: {
                type: "string",
                enum: [
                  "trigger",
                  "defensive",
                  "opportunity",
                  "attack",
                  "movement",
                  "exit",
                ],
              },
            },
            required: ["id", "label", "type"],
            additionalProperties: false,
          },
        },
        neural_connections: {
          type: "array",
          items: {
            type: "object",
            properties: {
              from: { type: "number" },
              to: { type: "number" },
              rule: { type: "string" },
            },
            required: ["from", "to", "rule"],
            additionalProperties: false,
          },
        },
        coach_explanation: {
          type: "string",
          description: "Why this works and when to use it (2-4 sentences).",
        },
        mistakes_to_avoid: {
          type: "array",
          items: { type: "string" },
        },
        advanced_variation: {
          type: "string",
          description: "An advanced variation or progression.",
        },
      },
      required: [
        "discipline",
        "tactic",
        "technique",
        "movement_1",
        "movement_2",
        "movement_3",
        "neural_nodes",
        "neural_connections",
        "coach_explanation",
        "mistakes_to_avoid",
        "advanced_variation",
      ],
      additionalProperties: false,
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Missing authorization" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) {
      return jsonResponse({ error: "AI gateway not configured" }, 500);
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) {
      return jsonResponse({ error: "Not authenticated" }, 401);
    }

    // Pro gating
    const { data: isPro, error: proErr } = await supabase.rpc("is_pro_user", {
      _user_id: userData.user.id,
    });
    if (proErr) {
      console.error("is_pro_user error:", proErr);
      return jsonResponse({ error: "Failed to verify subscription" }, 500);
    }
    if (!isPro) {
      return jsonResponse(
        { error: "Pro subscription required to use the AI Fighter Assistant." },
        403,
      );
    }

    const { messages, mode } = await req.json();
    if (!Array.isArray(messages) || messages.length === 0) {
      return jsonResponse({ error: "messages array required" }, 400);
    }

    const body: Record<string, unknown> = {
      model: "openai/gpt-5-mini",
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
    };

    if (mode === "analyse") {
      body.tools = [ANALYSE_TOOL];
      body.tool_choice = {
        type: "function",
        function: { name: "analyse_training_note" },
      };
    }

    const aiResp = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, errText);
      if (aiResp.status === 429) {
        return jsonResponse(
          { error: "Rate limit reached. Please wait a moment and try again." },
          429,
        );
      }
      if (aiResp.status === 402) {
        return jsonResponse(
          {
            error:
              "AI credits exhausted. Please add credits in Lovable Settings → Workspace → Usage.",
          },
          402,
        );
      }
      return jsonResponse({ error: "AI gateway error" }, 500);
    }

    const data = await aiResp.json();
    const choice = data.choices?.[0];

    if (mode === "analyse") {
      const toolCall = choice?.message?.tool_calls?.[0];
      if (!toolCall) {
        return jsonResponse({ error: "AI did not return structured analysis" }, 500);
      }
      try {
        const analysis = JSON.parse(toolCall.function.arguments);
        return jsonResponse({ analysis });
      } catch (e) {
        console.error("JSON parse error:", e);
        return jsonResponse({ error: "Failed to parse AI analysis" }, 500);
      }
    }

    return jsonResponse({
      reply: choice?.message?.content ?? "",
    });
  } catch (e) {
    console.error("ai-fighter-assistant error:", e);
    return jsonResponse(
      { error: e instanceof Error ? e.message : "Unknown error" },
      500,
    );
  }
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
