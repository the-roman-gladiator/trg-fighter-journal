
-- Add motivation fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS my_statement text,
  ADD COLUMN IF NOT EXISTS daily_motivation_mode text NOT NULL DEFAULT 'random',
  ADD COLUMN IF NOT EXISTS fixed_motivation_id uuid,
  ADD COLUMN IF NOT EXISTS custom_motivation_text text;

-- Create motivations library
CREATE TABLE public.motivations_library (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  day_number integer NOT NULL UNIQUE,
  motivation_text text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.motivations_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view motivations"
  ON public.motivations_library FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage motivations"
  ON public.motivations_library FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
