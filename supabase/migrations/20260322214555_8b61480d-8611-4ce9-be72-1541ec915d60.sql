
-- Create tags table
CREATE TABLE public.tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view tags" ON public.tags FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert tags" ON public.tags FOR INSERT TO authenticated WITH CHECK (true);

-- Create session_tags junction table
CREATE TABLE public.session_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.training_sessions(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(session_id, tag_id)
);

ALTER TABLE public.session_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own session tags" ON public.session_tags FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM training_sessions WHERE training_sessions.id = session_tags.session_id AND training_sessions.user_id = auth.uid()));

CREATE POLICY "Users can insert own session tags" ON public.session_tags FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM training_sessions WHERE training_sessions.id = session_tags.session_id AND training_sessions.user_id = auth.uid()));

CREATE POLICY "Users can delete own session tags" ON public.session_tags FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM training_sessions WHERE training_sessions.id = session_tags.session_id AND training_sessions.user_id = auth.uid()));
