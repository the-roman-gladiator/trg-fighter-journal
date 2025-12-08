-- Add strategy enum type
CREATE TYPE public.strategy AS ENUM ('Attacking', 'Defending', 'Countering', 'Intercepting', 'Transitions', 'Control');

-- Add new columns to training_sessions
ALTER TABLE public.training_sessions
ADD COLUMN strategy public.strategy,
ADD COLUMN first_movement text;