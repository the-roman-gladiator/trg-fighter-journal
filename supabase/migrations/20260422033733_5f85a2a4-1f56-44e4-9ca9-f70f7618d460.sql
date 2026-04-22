-- 1. Fix fighter_profiles self-approval bypass
DROP POLICY IF EXISTS "Users can update own fighter profile" ON public.fighter_profiles;

CREATE POLICY "Users can update own fighter profile"
ON public.fighter_profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid()
  AND fighter_status = 'pending'
  AND approved_fight_disciplines = '{}'::text[]
  AND approved_by_head_coach IS NULL
  AND approved_at IS NULL
  AND discipline_approved_by IS NULL
  AND discipline_approved_at IS NULL
);

-- 2. Fix workout_templates system template injection
-- Inspect existing policies and recreate INSERT/UPDATE with source_type restriction
DROP POLICY IF EXISTS "Users can insert their own templates" ON public.workout_templates;
DROP POLICY IF EXISTS "Users can update their own templates" ON public.workout_templates;
DROP POLICY IF EXISTS "Users can insert own templates" ON public.workout_templates;
DROP POLICY IF EXISTS "Users can update own templates" ON public.workout_templates;

CREATE POLICY "Users can insert their own templates"
ON public.workout_templates
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND COALESCE(source_type, 'user') <> 'system'
);

CREATE POLICY "Users can update their own templates"
ON public.workout_templates
FOR UPDATE
TO authenticated
USING (user_id = auth.uid() AND COALESCE(source_type, 'user') <> 'system')
WITH CHECK (
  user_id = auth.uid()
  AND COALESCE(source_type, 'user') <> 'system'
);

CREATE POLICY "Admins can manage all workout templates"
ON public.workout_templates
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 3. Lock down realtime.messages channel subscriptions
-- Only allow users to subscribe to channels named after their own user id
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can only access own channel" ON realtime.messages;

CREATE POLICY "Authenticated users can only access own channel"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  (realtime.topic() = ('user:' || auth.uid()::text))
);

-- 4. Tighten tags insert: authenticated only (already restricted to authenticated role,
-- but harden by replacing the always-true check with an explicit role check)
DROP POLICY IF EXISTS "Authenticated users can insert tags" ON public.tags;

CREATE POLICY "Authenticated users can insert tags"
ON public.tags
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);