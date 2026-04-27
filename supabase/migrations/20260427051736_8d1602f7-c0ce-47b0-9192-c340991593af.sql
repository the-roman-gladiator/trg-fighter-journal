-- ============================================================
-- 1. AI CONVERSATIONS + MESSAGES
-- ============================================================

CREATE TABLE public.ai_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT,
  model TEXT,
  message_count INTEGER NOT NULL DEFAULT 0,
  last_message_at TIMESTAMPTZ,
  archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_conversations_user_updated
  ON public.ai_conversations (user_id, updated_at DESC);

ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own AI conversations"
ON public.ai_conversations FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins view all AI conversations"
ON public.ai_conversations FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_ai_conversations_updated
BEFORE UPDATE ON public.ai_conversations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ----- messages -----

CREATE TABLE public.ai_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL DEFAULT '',
  mode TEXT CHECK (mode IN ('chat', 'analyse')),
  token_count INTEGER,
  latency_ms INTEGER,
  finish_reason TEXT,
  error TEXT,
  linked_ai_note_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_messages_conversation
  ON public.ai_messages (conversation_id, created_at);
CREATE INDEX idx_ai_messages_user_created
  ON public.ai_messages (user_id, created_at DESC);

ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own AI messages"
ON public.ai_messages FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins view all AI messages"
ON public.ai_messages FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- 2. AI MESSAGE FEEDBACK
-- ============================================================

CREATE TABLE public.ai_message_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.ai_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  rating TEXT NOT NULL CHECK (rating IN ('thumbs_up', 'thumbs_down')),
  reason TEXT,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id)
);

CREATE INDEX idx_ai_feedback_message ON public.ai_message_feedback (message_id);

ALTER TABLE public.ai_message_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own feedback"
ON public.ai_message_feedback FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins view all feedback"
ON public.ai_message_feedback FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- 3. ANALYTICS EVENTS  (the most important table for product learning)
-- ============================================================

CREATE TABLE public.analytics_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  session_id TEXT,
  event_name TEXT NOT NULL,
  event_category TEXT,
  properties JSONB NOT NULL DEFAULT '{}'::jsonb,
  route TEXT,
  app_mode TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_analytics_events_user_created
  ON public.analytics_events (user_id, created_at DESC);
CREATE INDEX idx_analytics_events_name_created
  ON public.analytics_events (event_name, created_at DESC);
CREATE INDEX idx_analytics_events_created
  ON public.analytics_events (created_at DESC);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Anyone (anon + authenticated) can insert events. Validate sizes to prevent abuse.
CREATE POLICY "Anyone can log analytics events"
ON public.analytics_events FOR INSERT TO anon, authenticated
WITH CHECK (
  char_length(event_name) BETWEEN 1 AND 80
  AND (event_category IS NULL OR char_length(event_category) <= 50)
  AND (route IS NULL OR char_length(route) <= 500)
  AND (app_mode IS NULL OR char_length(app_mode) <= 30)
  AND (user_agent IS NULL OR char_length(user_agent) <= 500)
  AND (session_id IS NULL OR char_length(session_id) <= 100)
  AND pg_column_size(properties) < 8192
  AND (
    user_id IS NULL
    OR user_id = auth.uid()
  )
);

-- Users can see their own events; admins see everything.
CREATE POLICY "Users view own events"
ON public.analytics_events FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins view all events"
ON public.analytics_events FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete events"
ON public.analytics_events FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- 4. ERROR LOGS
-- ============================================================

CREATE TABLE public.error_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  level TEXT NOT NULL DEFAULT 'error' CHECK (level IN ('error', 'warn', 'info')),
  source TEXT NOT NULL DEFAULT 'client' CHECK (source IN ('client', 'edge', 'db')),
  route TEXT,
  message TEXT NOT NULL,
  stack TEXT,
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_error_logs_created ON public.error_logs (created_at DESC);
CREATE INDEX idx_error_logs_user ON public.error_logs (user_id, created_at DESC);

ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- Anyone can submit error logs (so we capture pre-auth errors too).
CREATE POLICY "Anyone can submit error logs"
ON public.error_logs FOR INSERT TO anon, authenticated
WITH CHECK (
  char_length(message) BETWEEN 1 AND 4000
  AND (stack IS NULL OR char_length(stack) <= 8000)
  AND (route IS NULL OR char_length(route) <= 500)
  AND (user_agent IS NULL OR char_length(user_agent) <= 500)
  AND pg_column_size(context) < 8192
  AND (user_id IS NULL OR user_id = auth.uid())
);

CREATE POLICY "Admins view all error logs"
ON public.error_logs FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete error logs"
ON public.error_logs FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- 5. FEATURE FLAGS
-- ============================================================

CREATE TABLE public.feature_flags (
  key TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT false,
  rollout_percentage INTEGER NOT NULL DEFAULT 100 CHECK (rollout_percentage BETWEEN 0 AND 100),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

-- Anyone can read flags (so the app can branch on them).
CREATE POLICY "Anyone can read feature flags"
ON public.feature_flags FOR SELECT TO anon, authenticated
USING (true);

CREATE POLICY "Admins manage feature flags"
ON public.feature_flags FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_feature_flags_updated
BEFORE UPDATE ON public.feature_flags
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
