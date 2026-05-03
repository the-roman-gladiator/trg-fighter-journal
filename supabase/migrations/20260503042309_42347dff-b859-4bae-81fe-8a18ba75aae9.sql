-- Add sign-up wizard fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS terms_version text,
  ADD COLUMN IF NOT EXISTS privacy_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS privacy_version text,
  ADD COLUMN IF NOT EXISTS cookies_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS cookies_version text,
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS age_at_signup integer,
  ADD COLUMN IF NOT EXISTS parent_first_name text,
  ADD COLUMN IF NOT EXISTS parent_last_name text,
  ADD COLUMN IF NOT EXISTS parent_email text,
  ADD COLUMN IF NOT EXISTS parent_consent_at timestamptz,
  ADD COLUMN IF NOT EXISTS parent_consent_ip text,
  ADD COLUMN IF NOT EXISTS account_status text NOT NULL DEFAULT 'active';

-- Constrain status values
DO $$ BEGIN
  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_account_status_check
    CHECK (account_status IN ('active','blocked_underage'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;