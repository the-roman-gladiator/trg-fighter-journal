CREATE TABLE public.daily_reflections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT,
  content TEXT NOT NULL,
  mood_tag TEXT,
  reflection_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.daily_reflections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own reflections"
ON public.daily_reflections FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own reflections"
ON public.daily_reflections FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reflections"
ON public.daily_reflections FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reflections"
ON public.daily_reflections FOR DELETE
USING (auth.uid() = user_id);

CREATE TRIGGER update_daily_reflections_updated_at
BEFORE UPDATE ON public.daily_reflections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_daily_reflections_user_date ON public.daily_reflections(user_id, reflection_date DESC);