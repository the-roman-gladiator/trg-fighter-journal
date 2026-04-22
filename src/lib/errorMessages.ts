/**
 * Map raw Supabase / PostgreSQL errors to safe, user-friendly messages.
 * Prevents leaking schema details (table names, constraints, etc.) to the UI.
 *
 * Full error details are still logged to the browser console for developer
 * debugging — only the *message shown to the user* is sanitized.
 */
export function toUserMessage(err: unknown, fallback = "Something went wrong. Please try again."): string {
  if (!err) return fallback;

  // Always log the full error for debugging
  if (typeof console !== "undefined") {
    console.error("[error]", err);
  }

  const e = err as { code?: string; status?: number; message?: string; name?: string };

  // PostgREST / Supabase specific codes
  if (e.code === "PGRST116") return "Record not found.";
  if (e.code === "PGRST301") return "You do not have permission to perform this action.";
  if (e.code === "42501") return "You do not have permission to perform this action.";
  if (e.code?.startsWith("23")) return "This change conflicts with existing data. Please review and try again.";
  if (e.code?.startsWith("22")) return "Invalid input. Please check your entries and try again.";

  // Auth-related
  if (e.status === 401 || e.status === 403) return "You are not authorized. Please sign in and try again.";
  if (e.status === 429) return "Too many requests. Please wait a moment and try again.";
  if (e.status && e.status >= 500) return "Service temporarily unavailable. Please try again shortly.";

  // Common auth messages — keep user-friendly versions only
  const msg = (e.message || "").toLowerCase();
  if (msg.includes("invalid login")) return "Invalid email or password.";
  if (msg.includes("email not confirmed")) return "Please verify your email address before signing in.";
  if (msg.includes("user already registered")) return "An account with this email already exists.";
  if (msg.includes("password")) return "Password does not meet requirements.";
  if (msg.includes("network")) return "Network issue. Please check your connection and try again.";

  return fallback;
}
