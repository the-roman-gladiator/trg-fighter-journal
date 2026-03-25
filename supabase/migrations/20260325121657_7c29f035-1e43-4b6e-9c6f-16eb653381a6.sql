
-- Coach level enum
CREATE TYPE public.coach_level AS ENUM ('head_coach', 'main_coach', 'level_2', 'level_1');

-- Approval status enum
CREATE TYPE public.approval_status AS ENUM ('pending', 'approved', 'rejected');

-- Add coach hierarchy fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN coach_level public.coach_level DEFAULT NULL,
  ADD COLUMN coach_discipline text DEFAULT NULL,
  ADD COLUMN approval_status public.approval_status DEFAULT NULL,
  ADD COLUMN approved_by uuid DEFAULT NULL;
