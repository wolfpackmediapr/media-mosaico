
-- Create the categories table
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name_es TEXT NOT NULL,
  name_en TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Add Row Level Security (RLS)
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Create policy that allows everyone to read categories (they're configuration data)
CREATE POLICY "Anyone can view categories" 
  ON public.categories 
  FOR SELECT 
  USING (true);

-- Create policy that allows authenticated users to manage categories
CREATE POLICY "Authenticated users can manage categories" 
  ON public.categories 
  FOR ALL 
  USING (auth.role() = 'authenticated');

-- Insert the fallback categories data
INSERT INTO public.categories (name_es, name_en) VALUES
  ('ENTRETENIMIENTO', 'SHOW BUSINESS & ENTERTAINMENT'),
  ('EDUCACION & CULTURA', 'EDUCATION & CULTURE'),
  ('COMUNIDAD', 'COMMUNITY'),
  ('SALUD', 'HEALTH & FITNESS'),
  ('CRIMEN', 'CRIME'),
  ('TRIBUNALES', 'COURT & JUSTICE'),
  ('AMBIENTE & EL TIEMPO', 'WEATHER & ENVIRONMENT'),
  ('ECONOMIA & NEGOCIOS', 'BUSINESS & ECONOMY'),
  ('GOBIERNO', 'GOVERNMENT & GOV. AGENCIES'),
  ('POLITICA', 'POLITICS'),
  ('EE.UU. & INTERNACIONALES', 'USA & INTERNATIONAL NEWS'),
  ('DEPORTES', 'SPORTS'),
  ('RELIGION', 'RELIGIOUS'),
  ('OTRAS', 'OTHER'),
  ('ACCIDENTES', 'ACCIDENTS'),
  ('CIENCIA & TECNOLOGIA', 'SCIENCE & TECHNOLOGY'),
  ('AGENCIAS DE GOBIERNO', 'GOVERNMENT AGENCIES'),
  ('AMBIENTE', 'ENVIRONMENT');

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_categories_updated_at_trigger
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION update_categories_updated_at();
