import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are "Gladius", a fighter AI support and expert combat-sports coach assistant for MMA, Muay Thai, K1, Boxing, Wrestling, BJJ, and Grappling.

When the conversation has no prior assistant turns (this is your first reply to the user), START your response with a short warm greeting that introduces yourself, e.g.: "Hi, I'm Gladius, your fighter AI support." Then immediately help with their request. Do NOT re-introduce yourself on subsequent turns.

You help fighters and coaches by:
1. Analysing free-form training notes and converting them into a structured technical breakdown.
2. Answering questions about combos, counters, defence, attacking, grappling transitions, wrestling entries, BJJ positions, MMA strategy, fight tactics, and training improvement.

Speak in clear, simple, fighter-friendly language. Be specific and tactical. Avoid generic advice. Keep answers concise and skimmable — use short paragraphs and bullet points.

DISCIPLINE RULES (enforce when generating neural pathways):
- MMA: striking, wrestling, grappling, BJJ all allowed.
- K1 / Muay Thai: striking and clinch only — NO ground or BJJ branches.
- BJJ: ground positions, submissions, sweeps, transitions — NO striking branches.
- Wrestling: takedowns, control, scrambles — NO submissions/striking unless MMA mode.
- Grappling: positions, transitions, submissions — NO striking.

When the user asks for ANALYSIS of a training note, you MUST call the analyse_training_note tool.
When the user asks a general question, respond conversationally with markdown.`;

const MODEL = "google/gemini-2.5-flash";

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
        tactic: { type: "string" },
        technique: { type: "string" },
        movement_1: { type: "string" },
        movement_2: { type: "string" },
        movement_3: { type: "string" },
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
        coach_explanation: { type: "string" },
        mistakes_to_avoid: { type: "array", items: { type: "string" } },
        advanced_variation: { type: "string" },
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

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Helper: persist an error_logs row using the service-role client.
  const logError = async (
    userId: string | null,
    message: string,
    context: Record<string, unknown> = {},
  ) => {
    try {
      const admin = createClient(supabaseUrl, supabaseServiceKey);
      await admin.from("error_logs").insert({
        user_id: userId,
        level: "error",
        source: "edge",
        route: "/functions/v1/ai-fighter-assistant",
        message: String(message).slice(0, 4000),
        context,
      });
    } catch { /* never throw */ }
  };

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Missing authorization" }, 401);
    }

    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) {
      return jsonResponse({ error: "AI gateway not configured" }, 500);
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) {
      return jsonResponse({ error: "Not authenticated" }, 401);
    }
    const userId = userData.user.id;

    const { data: isPro, error: proErr } = await supabase.rpc("is_pro_user", {
      _user_id: userId,
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

    const { messages, mode, lastTokenId, conversationId } = await req.json();
    if (!Array.isArray(messages) || messages.length === 0) {
      return jsonResponse({ error: "messages array required" }, 400);
    }

    const isAnalyse = mode === "analyse";

    // -- Persist the latest user message + ensure conversation exists ----
    let convId: string | null = conversationId ?? null;
    const isReconnect = typeof lastTokenId === "number" && lastTokenId >= 0;

    if (!isReconnect) {
      const lastUserMsg = [...messages]
        .reverse()
        .find((m) => m.role === "user");
      if (lastUserMsg) {
        if (!convId) {
          const title = String(lastUserMsg.content).slice(0, 60);
          const { data: convRow, error: convErr } = await supabase
            .from("ai_conversations")
            .insert({
              user_id: userId,
              title,
              model: MODEL,
              message_count: 0,
              last_message_at: new Date().toISOString(),
            })
            .select("id")
            .single();
          if (convErr) {
            await logError(userId, `conv insert: ${convErr.message}`);
          } else {
            convId = convRow.id;
          }
        }
        if (convId) {
          await supabase.from("ai_messages").insert({
            conversation_id: convId,
            user_id: userId,
            role: "user",
            content: String(lastUserMsg.content).slice(0, 50_000),
            mode: isAnalyse ? "analyse" : "chat",
          });
          await supabase
            .from("ai_conversations")
            .update({
              last_message_at: new Date().toISOString(),
              message_count: messages.filter((m) =>
                ["user", "assistant"].includes(m.role)
              ).length,
            })
            .eq("id", convId);
        }
      }
    }

    const startedAt = Date.now();
    const body: Record<string, unknown> = {
      model: MODEL,
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
    };

    if (isAnalyse) {
      body.tools = [ANALYSE_TOOL];
      body.tool_choice = {
        type: "function",
        function: { name: "analyse_training_note" },
      };
    } else {
      body.stream = true;
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
      await logError(userId, `gateway ${aiResp.status}`, { errText });
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

    // ---- CHAT (streaming) ----
    if (!isAnalyse) {
      const skipUntil = typeof lastTokenId === "number" ? lastTokenId : -1;
      const upstream = aiResp.body!;
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();

      let tokenId = 0;
      let buffer = "";
      let assistantText = "";
      let finishReason: string | null = null;

      const transformed = new ReadableStream({
        async start(controller) {
          // Send conversation id as an initial event so the client can stash it.
          if (convId) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ meta: { conversationId: convId } })}\n\n`,
              ),
            );
          }
          const reader = upstream.getReader();
          try {
            while (true) {
              const { value, done } = await reader.read();
              if (done) break;
              buffer += decoder.decode(value, { stream: true });

              while (true) {
                const a = buffer.indexOf("\n\n");
                const b = buffer.indexOf("\r\n\r\n");
                let sepIdx = -1;
                let sepLen = 2;
                if (a !== -1 && (b === -1 || a < b)) {
                  sepIdx = a;
                  sepLen = 2;
                } else if (b !== -1) {
                  sepIdx = b;
                  sepLen = 4;
                }
                if (sepIdx === -1) break;
                const block = buffer.slice(0, sepIdx);
                buffer = buffer.slice(sepIdx + sepLen);

                const dataLines: string[] = [];
                for (let raw of block.split("\n")) {
                  if (raw.endsWith("\r")) raw = raw.slice(0, -1);
                  if (!raw || raw.startsWith(":")) continue;
                  if (!raw.startsWith("data:")) continue;
                  const v = raw.slice(5);
                  dataLines.push(v.startsWith(" ") ? v.slice(1) : v);
                }
                if (!dataLines.length) continue;
                const payload = dataLines.join("\n");

                if (payload === "[DONE]") {
                  controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
                  continue;
                }

                const id = tokenId++;
                if (id <= skipUntil) {
                  // Still accumulate so DB write has full text.
                  try {
                    const p = JSON.parse(payload);
                    const d = p.choices?.[0]?.delta?.content;
                    if (typeof d === "string") assistantText += d;
                    const f = p.choices?.[0]?.finish_reason;
                    if (f && f !== "null") finishReason = f;
                  } catch { /* ignore */ }
                  continue;
                }

                try {
                  const parsed = JSON.parse(payload);
                  parsed.tokenId = id;
                  const delta = parsed.choices?.[0]?.delta?.content;
                  if (typeof delta === "string") assistantText += delta;
                  const f = parsed.choices?.[0]?.finish_reason;
                  if (f && f !== "null") finishReason = f;
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify(parsed)}\n\n`),
                  );
                } catch {
                  controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
                }
              }
            }
          } catch (e) {
            console.error("stream transform error:", e);
            await logError(userId, `stream error: ${String(e)}`);
          } finally {
            controller.close();

            // Persist assistant message after stream completes.
            if (convId && assistantText && !isReconnect) {
              try {
                const admin = createClient(supabaseUrl, supabaseServiceKey);
                await admin.from("ai_messages").insert({
                  conversation_id: convId,
                  user_id: userId,
                  role: "assistant",
                  content: assistantText.slice(0, 50_000),
                  mode: "chat",
                  latency_ms: Date.now() - startedAt,
                  finish_reason: finishReason,
                });
              } catch (e) {
                console.error("assistant persist error:", e);
              }
            }
          }
        },
      });

      return new Response(transformed, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
          "X-Accel-Buffering": "no",
        },
      });
    }

    // ---- ANALYSE (tool call) ----
    const data = await aiResp.json();
    const choice = data.choices?.[0];
    const toolCall = choice?.message?.tool_calls?.[0];
    if (!toolCall) {
      await logError(userId, "no tool call returned");
      return jsonResponse({ error: "AI did not return structured analysis" }, 500);
    }
    try {
      const analysis = JSON.parse(toolCall.function.arguments);
      if (convId) {
        await supabase.from("ai_messages").insert({
          conversation_id: convId,
          user_id: userId,
          role: "assistant",
          content: JSON.stringify(analysis).slice(0, 50_000),
          mode: "analyse",
          latency_ms: Date.now() - startedAt,
          finish_reason: choice?.finish_reason ?? null,
        });
      }
      return jsonResponse({ analysis, conversationId: convId });
    } catch (e) {
      console.error("JSON parse error:", e);
      await logError(userId, `analyse parse: ${String(e)}`);
      return jsonResponse({ error: "Failed to parse AI analysis" }, 500);
    }
  } catch (e) {
    console.error("ai-fighter-assistant error:", e);
    await logError(null, e instanceof Error ? e.message : String(e));
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
