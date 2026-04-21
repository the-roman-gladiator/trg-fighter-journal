-- Notification settings (one row per user)
CREATE TABLE public.notification_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  daily_motivation_enabled BOOLEAN NOT NULL DEFAULT false,
  daily_motivation_days TEXT[] NOT NULL DEFAULT ARRAY['mon','tue','wed','thu','fri','sat','sun'],
  daily_motivation_time TIME NOT NULL DEFAULT '08:00',
  my_statement_enabled BOOLEAN NOT NULL DEFAULT false,
  my_statement_days TEXT[] NOT NULL DEFAULT ARRAY['mon','tue','wed','thu','fri','sat','sun'],
  my_statement_time TIME NOT NULL DEFAULT '07:00',
  enter_session_enabled BOOLEAN NOT NULL DEFAULT false,
  enter_session_days TEXT[] NOT NULL DEFAULT ARRAY['mon','tue','wed','thu','fri'],
  enter_session_time TIME NOT NULL DEFAULT '21:00',
  timezone TEXT NOT NULL DEFAULT 'Australia/Sydney',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notification settings"
  ON public.notification_settings FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own notification settings"
  ON public.notification_settings FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own notification settings"
  ON public.notification_settings FOR UPDATE
  USING (user_id = auth.uid());

CREATE TRIGGER update_notification_settings_updated_at
  BEFORE UPDATE ON public.notification_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Support tickets
CREATE TABLE public.support_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tickets"
  ON public.support_tickets FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own tickets"
  ON public.support_tickets FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own open tickets"
  ON public.support_tickets FOR UPDATE
  USING (user_id = auth.uid() AND status = 'open');

CREATE POLICY "Admins can view all tickets"
  ON public.support_tickets FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update all tickets"
  ON public.support_tickets FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_support_tickets_user_id ON public.support_tickets(user_id);
CREATE INDEX idx_support_tickets_status ON public.support_tickets(status);

-- Technique archive (personal user storage)
CREATE TABLE public.technique_archive (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_user_id UUID NOT NULL,
  title TEXT NOT NULL,
  disciplines TEXT[] NOT NULL DEFAULT '{}',
  strategy TEXT,
  class_type TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  notes TEXT,
  neural_pathway_data JSONB DEFAULT '{}'::jsonb,
  source_session_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.technique_archive ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own archive"
  ON public.technique_archive FOR SELECT
  USING (owner_user_id = auth.uid());

CREATE POLICY "Users can create own archive entries"
  ON public.technique_archive FOR INSERT
  WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "Users can update own archive"
  ON public.technique_archive FOR UPDATE
  USING (owner_user_id = auth.uid());

CREATE POLICY "Users can delete own archive"
  ON public.technique_archive FOR DELETE
  USING (owner_user_id = auth.uid());

CREATE POLICY "Head coaches can view all archive entries"
  ON public.technique_archive FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.coach_level = 'head_coach'::coach_level
  ));

CREATE POLICY "Admins can view all archive entries"
  ON public.technique_archive FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_technique_archive_updated_at
  BEFORE UPDATE ON public.technique_archive
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_technique_archive_owner ON public.technique_archive(owner_user_id);
CREATE INDEX idx_technique_archive_disciplines ON public.technique_archive USING GIN(disciplines);
CREATE INDEX idx_technique_archive_tags ON public.technique_archive USING GIN(tags);