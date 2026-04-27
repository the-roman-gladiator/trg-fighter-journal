ALTER TABLE public.technique_library RENAME COLUMN category TO tactic;
ALTER INDEX IF EXISTS idx_technique_library_category RENAME TO idx_technique_library_tactic;

ALTER TABLE public.technique_library
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS level text NOT NULL DEFAULT 'Beginner';

ALTER TABLE public.technique_library
  ADD CONSTRAINT technique_library_tactic_check
    CHECK (tactic IN ('Attacking','Defending','Countering','Intercepting','Transition','Control')),
  ADD CONSTRAINT technique_library_level_check
    CHECK (level IN ('Beginner','Intermediate','Advance')),
  ADD CONSTRAINT technique_library_k1_no_control_check
    CHECK (NOT (discipline = 'K1' AND tactic = 'Control'));

CREATE UNIQUE INDEX IF NOT EXISTS technique_library_discipline_name_en_key
  ON public.technique_library (discipline, lower(name_en));

CREATE INDEX IF NOT EXISTS idx_technique_library_level ON public.technique_library (level);