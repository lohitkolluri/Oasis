-- Fix: infinite recursion in RLS policy for public.profiles.
--
-- Root cause:
--   WITH CHECK used a subquery back to public.profiles to compare role:
--   role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
--   which can recursively invoke RLS policy evaluation.
--
-- Strategy:
--   1) Replace recursive UPDATE policy with a non-recursive self-update policy.
--   2) Enforce "users cannot self-change role" via a trigger (row OLD vs NEW),
--      allowing only service-role/admin backend paths to change role.

-- 1) Non-recursive self-update policy
DROP POLICY IF EXISTS "profiles_update_self_no_role" ON public.profiles;

CREATE POLICY "profiles_update_self"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

COMMENT ON POLICY "profiles_update_self" ON public.profiles IS
  'Self-update policy without recursive subqueries. Role immutability enforced by trigger.';

-- 2) Role immutability trigger for non-service JWT roles
CREATE OR REPLACE FUNCTION public.prevent_profile_role_change_for_non_service()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_jwt_role TEXT := COALESCE(current_setting('request.jwt.claim.role', true), '');
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    -- Allow server-side admin/service flows; block direct authenticated-user escalation.
    IF v_jwt_role NOT IN ('', 'service_role', 'supabase_admin') THEN
      RAISE EXCEPTION 'role cannot be changed by authenticated users';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_profile_role_change_for_non_service ON public.profiles;
CREATE TRIGGER trg_prevent_profile_role_change_for_non_service
BEFORE UPDATE OF role ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_profile_role_change_for_non_service();
