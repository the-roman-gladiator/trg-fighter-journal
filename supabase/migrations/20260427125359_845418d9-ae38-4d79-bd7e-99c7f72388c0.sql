-- 1) Add the canonical 'Transition' value to the strategy enum (kept side-by-side with legacy labels)
ALTER TYPE public.strategy ADD VALUE IF NOT EXISTS 'Transition';

-- 2) Add 'Transition' and 'Control' to tactical_goal enum
ALTER TYPE public.tactical_goal ADD VALUE IF NOT EXISTS 'Transition';
ALTER TYPE public.tactical_goal ADD VALUE IF NOT EXISTS 'Control';

-- 3) Migrate existing data on training_sessions.strategy (enum column) to canonical 'Transition'
--    Must be in a separate transaction step from ADD VALUE, so we use a DO block after commit.
--    Postgres requires the new enum value to be committed before it can be used in the same tx,
--    so we wrap migration in a separate statement after the COMMIT below.
COMMIT;

UPDATE public.training_sessions
   SET strategy = 'Transition'::public.strategy
 WHERE strategy::text IN ('Transitions','Transiction');

-- 4) Migrate text-based fighter_sessions.strategy / .tactic columns
UPDATE public.fighter_sessions
   SET strategy = 'Transition'
 WHERE strategy IN ('Transitions','Transiction');

UPDATE public.fighter_sessions
   SET tactic = 'Transition'
 WHERE tactic IN ('Transitions','Transiction');

-- 5) Migrate ai_fighter_notes.tactic (text)
UPDATE public.ai_fighter_notes
   SET tactic = 'Transition'
 WHERE tactic IN ('Transitions','Transiction');

-- 6) Normalise "Ground and Pound" technique label in ai_fighter_notes
UPDATE public.ai_fighter_notes
   SET technique = 'Ground & Pound'
 WHERE technique IN ('Ground and Pound');