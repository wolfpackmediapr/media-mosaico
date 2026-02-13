
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'pg_catalog'
AS $function$
BEGIN
  INSERT INTO public.user_profiles (id, username, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'username', NEW.email), 
          COALESCE(NEW.raw_user_meta_data->>'role', 'data_entry')::user_role);
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'role', 'data_entry')::user_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$function$;
