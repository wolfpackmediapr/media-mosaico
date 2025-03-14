
-- Function to delete a user (requires security definer)
CREATE OR REPLACE FUNCTION public.delete_user(user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete from auth.users (which will cascade to user_profiles)
  DELETE FROM auth.users WHERE id = user_id;
END;
$$;
