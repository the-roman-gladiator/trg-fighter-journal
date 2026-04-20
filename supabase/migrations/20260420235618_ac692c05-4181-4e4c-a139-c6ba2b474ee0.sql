-- Phase 1: multi-discipline support on training sessions
ALTER TABLE public.training_sessions
  ADD COLUMN IF NOT EXISTS disciplines text[] NOT NULL DEFAULT '{}'::text[];

-- Backfill from existing single discipline so old rows are preserved
UPDATE public.training_sessions
SET disciplines = ARRAY[discipline::text]
WHERE (disciplines IS NULL OR array_length(disciplines, 1) IS NULL)
  AND discipline IS NOT NULL;

-- GIN index for fast multi-discipline queries (pathway / trends)
CREATE INDEX IF NOT EXISTS idx_training_sessions_disciplines
  ON public.training_sessions USING GIN (disciplines);