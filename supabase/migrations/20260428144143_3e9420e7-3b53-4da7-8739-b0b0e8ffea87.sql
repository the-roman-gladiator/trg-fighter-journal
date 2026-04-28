ALTER TABLE public.training_sessions ADD COLUMN IF NOT EXISTS video_url text;
ALTER TABLE public.coach_sessions ADD COLUMN IF NOT EXISTS video_url text;
ALTER TABLE public.fighter_sessions ADD COLUMN IF NOT EXISTS video_url text;