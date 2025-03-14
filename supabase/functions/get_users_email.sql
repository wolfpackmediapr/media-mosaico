
-- Function to get emails from auth.users (requires security definer)
CREATE OR REPLACE FUNCTION public.get_users_email(user_ids UUID[])
RETURNS TABLE (
  id UUID,
  email TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT au.id, au.email
  FROM auth.users au
  WHERE au.id = ANY(user_ids);
END;
$$;
