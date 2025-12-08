-- Add opponent_action and second_movement columns to training_sessions
ALTER TABLE public.training_sessions
ADD COLUMN opponent_action text,
ADD COLUMN second_movement text;