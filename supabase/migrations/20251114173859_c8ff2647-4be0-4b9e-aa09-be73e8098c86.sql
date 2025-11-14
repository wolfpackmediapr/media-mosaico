-- Fix critical authorization issues in SECURITY DEFINER functions

-- 1. Add authorization check to delete_user function
CREATE OR REPLACE FUNCTION public.delete_user(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Add authorization check - only administrators can delete users
  IF NOT public.has_role(auth.uid(), 'administrator') THEN
    RAISE EXCEPTION 'Only administrators can delete users';
  END IF;
  
  -- Prevent self-deletion
  IF user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot delete your own account';
  END IF;
  
  DELETE FROM auth.users WHERE id = user_id;
END;
$function$;

-- 2. Add authorization check to get_users_email function
CREATE OR REPLACE FUNCTION public.get_users_email(user_ids uuid[])
RETURNS TABLE(id uuid, email text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Restrict to administrators only
  IF NOT public.has_role(auth.uid(), 'administrator') THEN
    RAISE EXCEPTION 'Only administrators can access user emails';
  END IF;
  
  RETURN QUERY
  SELECT au.id, au.email
  FROM auth.users au
  WHERE au.id = ANY(user_ids);
END;
$function$;

-- 3. Restrict media_outlets table to authenticated users
DROP POLICY IF EXISTS "Allow all users to view media outlets" ON public.media_outlets;

CREATE POLICY "Authenticated users can view media outlets"
ON public.media_outlets FOR SELECT
USING (auth.role() = 'authenticated');

-- 4. Add proper RLS policies to media_outlets for other operations if needed
ALTER TABLE public.media_outlets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can insert media outlets"
ON public.media_outlets FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update media outlets"
ON public.media_outlets FOR UPDATE
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete media outlets"
ON public.media_outlets FOR DELETE
USING (auth.role() = 'authenticated');