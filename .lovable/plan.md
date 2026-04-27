# 🚀 Launch-Readiness Data Plan

Goal: by next weekend, every meaningful user action — AI conversations, sessions, errors, feature usage — is captured server-side so you can learn what users actually need.

## 📊 Current State — what's already stored well

✅ Training sessions, technique chains, strength workouts, cardio
✅ AI **analysis results** (`ai_fighter_notes`) — structured outputs persisted
✅ Pathway nodes/edges, reflections, fighter & coach profiles
✅ Subscriptions, support tickets, beta requests
✅ User custom lists, notification settings

## ❌ Critical gaps before launch

| Gap | Impact |
|---|---|
| **AI chat conversations live only in `localStorage`** | Lost on device change/clear. Can't study what users actually ask Gladius. |
| **No event/analytics table** | Can't answer "which features are used", "where do users drop off". |
| **No error log table** | Edge function errors only visible in Supabase logs (ephemeral). |
| **No user feedback / NPS / thumbs up-down on AI replies** | No quality signal on Gladius answers. |
| **No session view of Pathway / Library / Trends usage** | Don't know if features matter. |
| **No onboarding completion tracking** | Can't measure activation funnel. |
| **No admin analytics dashboard** | You'd be querying SQL by hand at launch. |

---

## 🗄️ Phase 1 — New tables (migration)

### 1. `ai_conversations` + `ai_messages` (replace localStorage)
- `ai_conversations`: `id, user_id, title, model, created_at, updated_at, message_count, last_message_at, archived`
- `ai_messages`: `id, conversation_id, user_id, role (user/assistant/system), content, mode (chat/analyse), token_count, latency_ms, finish_reason, error, linked_ai_note_id, created_at`
- RLS: user manages own; admin reads all.
- Edge function logs every prompt + completion (with token counts) so you can audit cost & quality.

### 2. `ai_message_feedback`
- `id, message_id, user_id, rating (thumbs_up/thumbs_down), reason, comment, created_at`
- Add 👍 / 👎 buttons on every Gladius reply.

### 3. `analytics_events` (the one big one)
- `id, user_id (nullable for anon), session_id (browser session), event_name, event_category, properties jsonb, route, app_mode, user_agent, created_at`
- Indexed on `(user_id, created_at)`, `(event_name, created_at)`.
- Captured events:
  - `auth_signup`, `auth_login`, `auth_logout`
  - `onboarding_started`, `onboarding_step_completed`, `onboarding_finished`
  - `session_created`, `session_completed`, `session_deleted` (discipline in props)
  - `pathway_node_added`, `pathway_node_opened`
  - `library_search`, `library_filter_applied`
  - `ai_chat_opened`, `ai_message_sent`, `ai_analysis_run`, `ai_pdf_exported`, `ai_chat_stopped`
  - `mode_switched` (athlete/fighter/coach)
  - `subscription_upgrade_clicked`, `subscription_started`
  - `feature_blocked_paywall` (which feature was attempted)
  - `coach_invite_sent`, `coach_invite_redeemed`
  - `notification_enabled` / `disabled`
- Insert via small `useAnalytics()` hook (`logEvent(name, props)`).

### 4. `error_logs`
- `id, user_id, level (error/warn/info), source (client/edge), route, message, stack, context jsonb, user_agent, created_at`
- Wired into a global React error boundary + `window.onerror` + edge function `catch` blocks.

### 5. `user_activity_summary` (materialized rollup, refreshed daily)
- Per-user: last_active, total_sessions, total_ai_messages, days_active_7d/30d, current_streak, primary_discipline.
- Powers the admin dashboard fast.

### 6. `feature_flags` (optional, recommended)
- `key, enabled, rollout_percentage, description` — lets you kill/ship features at launch without redeploy.

---

## 🔧 Phase 2 — Wiring

1. **Edge function update** (`ai-fighter-assistant`):
   - On request: insert `ai_conversations` row if new, insert user `ai_messages` row.
   - On stream finish (or analyse return): insert assistant `ai_messages` row with token counts, latency, finish_reason.
   - On error: insert into `error_logs`.

2. **Client `AIFighterAssistant.tsx`**:
   - Replace `localStorage` history with `ai_conversations` query.
   - Add 👍/👎 under each assistant reply → `ai_message_feedback`.
   - Keep localStorage as offline cache only.

3. **`useAnalytics()` hook + `<AnalyticsProvider>`**:
   - Auto-logs `route_changed` on every navigation.
   - Exposes `logEvent(name, props)` used everywhere relevant.
   - Batches inserts (every 5s or 10 events) to avoid request spam.

4. **Global ErrorBoundary** + `window.addEventListener('error' | 'unhandledrejection')` → `error_logs`.

5. **Admin dashboard page** (`/admin/analytics`, gated by `has_role('admin')`):
   - DAU/WAU/MAU
   - New signups per day
   - AI messages per day + avg latency + thumbs-up rate
   - Top events (most-used features)
   - Funnel: signup → onboarding → first session → first AI chat → upgrade to Pro
   - Recent errors
   - Subscription mix (free/basic/pro)

---

## 🔒 Privacy & retention

- All tables RLS-protected: users see only their own rows; only `admin` role sees aggregates.
- AI message content stored — add a short notice in the AI page footer: *"Conversations are stored to improve the assistant."*
- Add a "Delete my data" button on Profile (deletes conversations, events, archive).
- Auto-purge `analytics_events` & `error_logs` older than 180 days via scheduled function (optional after launch).

---

## 📋 Build order (fits a week)

1. **Day 1** — Migration: `ai_conversations`, `ai_messages`, `ai_message_feedback`, `analytics_events`, `error_logs`. RLS + indexes.
2. **Day 2** — Update edge function to persist chats + Pro-aware. Migrate chat UI from localStorage → DB; add feedback buttons.
3. **Day 3** — `useAnalytics()` hook + global ErrorBoundary. Instrument top 15 events listed above.
4. **Day 4** — Admin analytics dashboard at `/admin/analytics` (read-only charts using `recharts`).
5. **Day 5** — Privacy notice + "Delete my data" + final QA. Optional: feature_flags table + simple admin toggle.
6. **Day 6–7** — Beta-user smoke test, fix gaps, launch.

---

## ❓ Two quick decisions before I build

1. **AI chat content storage** — store full message text server-side (recommended, enables quality work + PDF export across devices) or store metadata only (more private, but you lose the ability to learn from actual prompts)?
2. **Admin dashboard scope for launch** — full charts page (DAU, funnels, AI quality) or minimal "recent activity + counts" page now and full charts post-launch?

Once you confirm, I'll switch to default mode and start with the Phase 1 migration.
