CREATE TABLE public.user_section_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  section TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, section)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_section_permissions TO authenticated;
GRANT ALL ON public.user_section_permissions TO service_role;

ALTER TABLE public.user_section_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own permissions"
ON public.user_section_permissions FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'administrator'));

CREATE POLICY "Admins can insert permissions"
ON public.user_section_permissions FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'administrator'));

CREATE POLICY "Admins can update permissions"
ON public.user_section_permissions FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'administrator'))
WITH CHECK (public.has_role(auth.uid(), 'administrator'));

CREATE POLICY "Admins can delete permissions"
ON public.user_section_permissions FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'administrator'));

CREATE TRIGGER update_user_section_permissions_updated_at
BEFORE UPDATE ON public.user_section_permissions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed: grant all sections to every existing data_entry user so nothing changes for them until an admin edits
INSERT INTO public.user_section_permissions (user_id, section)
SELECT up.id, s.section
FROM public.user_profiles up
CROSS JOIN (VALUES
  ('inicio'),('publiteca'),('tv'),('radio'),('prensa'),('prensa-escrita'),
  ('redes-sociales'),('notificaciones'),('envio-alertas'),('reportes')
) AS s(section)
WHERE up.role = 'data_entry'
ON CONFLICT (user_id, section) DO NOTHING;