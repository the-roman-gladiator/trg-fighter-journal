-- Add optional fighter-note fields to training_sessions
ALTER TABLE public.training_sessions
  ADD COLUMN IF NOT EXISTS make_fighter_note boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fighter_profile_id uuid NULL,
  ADD COLUMN IF NOT EXISTS is_fighter_stat_eligible boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS attempts_count integer NULL,
  ADD COLUMN IF NOT EXISTS executed_count integer NULL,
  ADD COLUMN IF NOT EXISTS physical_effort_execution text NULL,
  ADD COLUMN IF NOT EXISTS mindset_effort_execution text NULL,
  ADD COLUMN IF NOT EXISTS execution_rate numeric NULL;

-- Validation trigger: enforce non-negative ints, executed <= attempts, auto-calc execution_rate
CREATE OR REPLACE FUNCTION public.validate_fighter_note_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.make_fighter_note = true THEN
    IF NEW.attempts_count IS NOT NULL AND NEW.attempts_count < 0 THEN
      RAISE EXCEPTION 'attempts_count must be >= 0';
    END IF;
    IF NEW.executed_count IS NOT NULL AND NEW.executed_count < 0 THEN
      RAISE EXCEPTION 'executed_count must be >= 0';
    END IF;
    IF NEW.attempts_count IS NOT NULL AND NEW.executed_count IS NOT NULL
       AND NEW.executed_count > NEW.attempts_count THEN
      RAISE EXCEPTION 'executed_count cannot exceed attempts_count';
    END IF;

    IF NEW.attempts_count IS NULL OR NEW.attempts_count = 0 THEN
      NEW.execution_rate := 0;
    ELSE
      NEW.execution_rate := ROUND((COALESCE(NEW.executed_count, 0)::numeric / NEW.attempts_count::numeric) * 100, 2);
    END IF;

    NEW.is_fighter_stat_eligible := true;
  ELSE
    NEW.is_fighter_stat_eligible := false;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_fighter_note ON public.training_sessions;
CREATE TRIGGER trg_validate_fighter_note
BEFORE INSERT OR UPDATE ON public.training_sessions
FOR EACH ROW
EXECUTE FUNCTION public.validate_fighter_note_fields();

-- Allow head coaches to view + update fighter-note sessions
DROP POLICY IF EXISTS "Head coaches can view fighter-note sessions" ON public.training_sessions;
CREATE POLICY "Head coaches can view fighter-note sessions"
ON public.training_sessions
FOR SELECT
TO authenticated
USING (
  make_fighter_note = true
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.coach_level = 'head_coach'::coach_level
  )
);

DROP POLICY IF EXISTS "Head coaches can update fighter-note sessions" ON public.training_sessions;
CREATE POLICY "Head coaches can update fighter-note sessions"
ON public.training_sessions
FOR UPDATE
TO authenticated
USING (
  make_fighter_note = true
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.coach_level = 'head_coach'::coach_level
  )
);

CREATE INDEX IF NOT EXISTS idx_training_sessions_fighter_note
  ON public.training_sessions(user_id, make_fighter_note)
  WHERE make_fighter_note = true;