
-- Allow admins to update any user profile
CREATE POLICY "Administrators can update all profiles"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (get_user_role(auth.uid()) = 'administrator')
WITH CHECK (get_user_role(auth.uid()) = 'administrator');

-- Sync trigger: keep user_roles in sync when user_profiles.role changes
CREATE OR REPLACE FUNCTION public.sync_user_role_on_profile_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    UPDATE public.user_roles
    SET role = NEW.role::user_role
    WHERE user_id = NEW.id;

    IF NOT FOUND THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, NEW.role::user_role);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_role_to_user_roles
AFTER UPDATE OF role ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_user_role_on_profile_update();
