-- 1. Subscriptions table
CREATE TYPE public.subscription_tier AS ENUM ('free', 'fighter', 'coach', 'pro', 'pro_coach');
CREATE TYPE public.subscription_status AS ENUM ('active', 'cancelled', 'expired', 'trial');

CREATE TABLE public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  tier public.subscription_tier NOT NULL DEFAULT 'free',
  status public.subscription_status NOT NULL DEFAULT 'active',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own subscription"
  ON public.subscriptions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins manage all subscriptions"
  ON public.subscriptions FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create free subscription on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id, tier, status)
  VALUES (NEW.id, 'free', 'active')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_subscription
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_subscription();

-- Backfill subscriptions for existing users
INSERT INTO public.subscriptions (user_id, tier, status)
SELECT id, 'free', 'active' FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;

-- Helper function: is user pro?
CREATE OR REPLACE FUNCTION public.is_pro_user(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(_user_id, 'admin')
    OR EXISTS (
      SELECT 1 FROM public.subscriptions
      WHERE user_id = _user_id
        AND tier IN ('pro', 'pro_coach')
        AND status = 'active'
        AND (expires_at IS NULL OR expires_at > now())
    );
$$;

-- 2. AI Fighter Notes table
CREATE TABLE public.ai_fighter_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  athlete_id UUID,
  coach_id UUID,
  original_input TEXT NOT NULL,
  discipline TEXT,
  tactic TEXT,
  technique TEXT,
  movement_1 TEXT,
  movement_2 TEXT,
  movement_3 TEXT,
  neural_nodes JSONB NOT NULL DEFAULT '[]'::jsonb,
  neural_connections JSONB NOT NULL DEFAULT '[]'::jsonb,
  coach_explanation TEXT,
  mistakes_to_avoid JSONB NOT NULL DEFAULT '[]'::jsonb,
  advanced_variation TEXT,
  save_type TEXT,
  coach_reviewed BOOLEAN NOT NULL DEFAULT false,
  linked_session_id UUID,
  linked_pathway_node_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_fighter_notes ENABLE ROW LEVEL SECURITY;

-- Owner Pro user CRUD
CREATE POLICY "Pro users manage own AI notes"
  ON public.ai_fighter_notes FOR ALL
  TO authenticated
  USING (user_id = auth.uid() AND public.is_pro_user(auth.uid()))
  WITH CHECK (user_id = auth.uid() AND public.is_pro_user(auth.uid()));

-- Approving coach can read notes from athletes they approved (existing approval flow)
CREATE POLICY "Approving coach can view athlete AI notes"
  ON public.ai_fighter_notes FOR SELECT
  TO authenticated
  USING (
    public.is_pro_user(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = ai_fighter_notes.user_id
        AND p.approved_by = auth.uid()
    )
  );

-- Approving coach can update review status only via update policy
CREATE POLICY "Approving coach can review athlete AI notes"
  ON public.ai_fighter_notes FOR UPDATE
  TO authenticated
  USING (
    public.is_pro_user(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = ai_fighter_notes.user_id
        AND p.approved_by = auth.uid()
    )
  );

-- Admins manage all
CREATE POLICY "Admins manage all AI notes"
  ON public.ai_fighter_notes FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_ai_fighter_notes_updated_at
  BEFORE UPDATE ON public.ai_fighter_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_ai_fighter_notes_user ON public.ai_fighter_notes(user_id, created_at DESC);
CREATE INDEX idx_ai_fighter_notes_athlete ON public.ai_fighter_notes(athlete_id) WHERE athlete_id IS NOT NULL;