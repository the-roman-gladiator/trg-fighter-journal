ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS nickname text,
  ADD COLUMN IF NOT EXISTS account_type text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS fitness_level text;