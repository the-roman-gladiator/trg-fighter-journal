
CREATE OR REPLACE FUNCTION public.delete_my_personal_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  conv_count int := 0;
  msg_count int := 0;
  fb_count int := 0;
  ev_count int := 0;
  err_count int := 0;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  DELETE FROM public.ai_message_feedback WHERE user_id = uid;
  GET DIAGNOSTICS fb_count = ROW_COUNT;

  DELETE FROM public.ai_messages WHERE user_id = uid;
  GET DIAGNOSTICS msg_count = ROW_COUNT;

  DELETE FROM public.ai_conversations WHERE user_id = uid;
  GET DIAGNOSTICS conv_count = ROW_COUNT;

  DELETE FROM public.analytics_events WHERE user_id = uid;
  GET DIAGNOSTICS ev_count = ROW_COUNT;

  DELETE FROM public.error_logs WHERE user_id = uid;
  GET DIAGNOSTICS err_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'deleted', jsonb_build_object(
      'conversations', conv_count,
      'messages', msg_count,
      'feedback', fb_count,
      'events', ev_count,
      'errors', err_count
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.delete_my_personal_data() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_my_personal_data() TO authenticated;
