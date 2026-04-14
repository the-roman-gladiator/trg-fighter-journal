ALTER TABLE public.training_sessions 
  ADD COLUMN before_emotion text,
  ADD COLUMN before_mindset text,
  ADD COLUMN after_emotion text,
  ADD COLUMN after_mindset text,
  ADD COLUMN physical_effort_level text,
  ADD COLUMN mental_effort_level text,
  ADD COLUMN effort_score numeric;