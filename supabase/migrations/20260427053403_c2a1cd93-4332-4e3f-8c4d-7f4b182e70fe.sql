REVOKE EXECUTE ON FUNCTION public.delete_my_personal_data() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_my_personal_data() TO authenticated;