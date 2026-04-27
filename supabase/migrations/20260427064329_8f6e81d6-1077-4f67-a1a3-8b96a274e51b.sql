-- Lock down all SECURITY DEFINER functions: revoke from PUBLIC/anon, grant to authenticated where needed.
-- Trigger-only functions: revoke from everyone (triggers run as table owner regardless).

-- User-callable RPCs (need authenticated execute)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_head_coach(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.is_head_coach(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_coach_level(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_coach_level(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_coach_disciplines(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_coach_disciplines(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.user_has_fighter_profile(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.user_has_fighter_profile(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.can_invite_coach_level(uuid, public.coach_level) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.can_invite_coach_level(uuid, public.coach_level) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_pro_user(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.is_pro_user(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.delegated_nominations_enabled() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.delegated_nominations_enabled() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.coach_can_access_discipline(uuid, text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.coach_can_access_discipline(uuid, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.redeem_coach_invitation(text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.redeem_coach_invitation(text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.promote_existing_user_to_coach(text, public.coach_level, text[]) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.promote_existing_user_to_coach(text, public.coach_level, text[]) TO authenticated;

-- Trigger-only functions: revoke from everyone, no API access needed
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_subscription() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_fighter_note_fields() FROM PUBLIC, anon, authenticated;