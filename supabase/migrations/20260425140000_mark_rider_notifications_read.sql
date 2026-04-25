-- Allow riders to clear unread notification state (home screen badge uses read_at).

CREATE OR REPLACE FUNCTION public.mark_rider_notifications_read()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count integer;
BEGIN
  UPDATE public.rider_notifications
  SET read_at = now()
  WHERE profile_id = auth.uid()
    AND read_at IS NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

COMMENT ON FUNCTION public.mark_rider_notifications_read() IS
  'Sets read_at for all unread rider_notifications for the current user; used for badge / inbox clear.';

REVOKE ALL ON FUNCTION public.mark_rider_notifications_read() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_rider_notifications_read() TO authenticated;
