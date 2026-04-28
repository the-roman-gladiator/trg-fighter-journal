CREATE OR REPLACE FUNCTION public.signups_open()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (SELECT 1 FROM public.profiles LIMIT 1);
$$;

GRANT EXECUTE ON FUNCTION public.signups_open() TO anon, authenticated;