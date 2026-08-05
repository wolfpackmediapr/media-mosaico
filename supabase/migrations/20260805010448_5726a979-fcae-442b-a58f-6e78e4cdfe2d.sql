-- Helper: stable slug generation
CREATE OR REPLACE FUNCTION public.slugify(_txt text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT trim(both '-' from regexp_replace(
    lower(translate(_txt,
      'áàäâéèëêíìïîóòöôúùüûñçÁÀÄÂÉÈËÊÍÌÏÎÓÒÖÔÚÙÜÛÑÇ',
      'aaaaeeeeiiiioooouuuuncAAAAEEEEIIIIOOOOUUUUNC')),
    '[^a-z0-9]+', '-', 'g'))
$$;

-- 1. Categories
CREATE TABLE IF NOT EXISTS public.client_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.client_categories TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.client_categories TO authenticated;
GRANT ALL ON public.client_categories TO service_role;

ALTER TABLE public.client_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "client_categories_select" ON public.client_categories;
CREATE POLICY "client_categories_select" ON public.client_categories
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "client_categories_admin_write" ON public.client_categories;
CREATE POLICY "client_categories_admin_write" ON public.client_categories
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'administrator'))
  WITH CHECK (public.has_role(auth.uid(), 'administrator'));

-- 2. Subcategories
CREATE TABLE IF NOT EXISTS public.client_subcategories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.client_categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS client_subcategories_category_idx ON public.client_subcategories(category_id);

GRANT SELECT ON public.client_subcategories TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.client_subcategories TO authenticated;
GRANT ALL ON public.client_subcategories TO service_role;

ALTER TABLE public.client_subcategories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "client_subcategories_select" ON public.client_subcategories;
CREATE POLICY "client_subcategories_select" ON public.client_subcategories
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "client_subcategories_admin_write" ON public.client_subcategories;
CREATE POLICY "client_subcategories_admin_write" ON public.client_subcategories
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'administrator'))
  WITH CHECK (public.has_role(auth.uid(), 'administrator'));

-- 3. Timestamps
DROP TRIGGER IF EXISTS set_client_categories_updated_at ON public.client_categories;
CREATE TRIGGER set_client_categories_updated_at
  BEFORE UPDATE ON public.client_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_client_subcategories_updated_at ON public.client_subcategories;
CREATE TRIGGER set_client_subcategories_updated_at
  BEFORE UPDATE ON public.client_subcategories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Client linkage (legacy text columns left untouched)
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS client_category_id uuid REFERENCES public.client_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS client_subcategory_id uuid REFERENCES public.client_subcategories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS clients_client_category_idx ON public.clients(client_category_id);

-- 5. Seed taxonomy (idempotent via slug)
WITH cats(name, ord) AS (
  VALUES
    ('Ambiente',1),('Asociaciones, Uniones y Sindicatos',2),('Automotriz',3),
    ('Banca, Inversiones y Seguros',4),('Belleza',5),('Bienes Raíces',6),
    ('Comunicaciones',7),('Construcción',8),('Cultura',9),('Deportes',10),
    ('Educación',11),('Energía',12),('Entretenimiento',13),('Gobierno',14),
    ('Hogar',15),('Industria de Alimentos y Bebidas',16),
    ('Industria del Tabaco, Cigarrillos y Vapes',17),('Mensajería / Entrega de Paquetes',18),
    ('Organizaciones sin Fines de Lucro',19),('Política',20),('Puertos',21),
    ('Religión',22),('Salud',23),('Servicios',24),('Tecnología',25),
    ('Telecomunicaciones',26),('Tiendas / Centros Comerciales',27),('Transporte',28),
    ('Turismo y Hotelería',29)
)
INSERT INTO public.client_categories (name, slug, sort_order)
SELECT name, public.slugify(name), ord FROM cats
ON CONFLICT (slug) DO NOTHING;

WITH subs(cat, name, ord) AS (
  VALUES
    ('Ambiente','Agricultura',1),('Ambiente','Protección del Ambiente',2),('Ambiente','Reciclaje',3),
    ('Ambiente','Desperdicios Sólidos',4),('Ambiente','Vertederos',5),('Ambiente','Ganadería',6),
    ('Automotriz','Dealers',1),('Automotriz','Autos',2),('Automotriz','Tiendas de Repuestos de Autos',3),
    ('Banca, Inversiones y Seguros','Bancos',1),('Banca, Inversiones y Seguros','Cooperativas',2),
    ('Banca, Inversiones y Seguros','Financieras',3),('Banca, Inversiones y Seguros','Seguros',4),
    ('Banca, Inversiones y Seguros','Mortgage',5),('Banca, Inversiones y Seguros','Tarjetas de Crédito',6),
    ('Banca, Inversiones y Seguros','Soluciones Comerciales',7),('Banca, Inversiones y Seguros','Inversiones',8),
    ('Belleza','Estéticas',1),('Belleza','Productos de Belleza',2),('Belleza','Salones de Belleza',3),
    ('Comunicaciones','Publicidad',1),('Comunicaciones','Canales de TV',2),('Comunicaciones','Emisoras de Radio',3),
    ('Comunicaciones','Prensa Escrita',4),('Comunicaciones','Relaciones Públicas',5),('Comunicaciones','Mercadeo',6),
    ('Construcción','Pinturas y Selladores',1),('Construcción','Ferreterías',2),('Construcción','Cemento',3),
    ('Construcción','Acero',4),('Construcción','Aluminio',5),
    ('Cultura','Museos',1),('Cultura','Galerías de Arte',2),
    ('Deportes','Equipos',1),
    ('Educación','Colegios',1),('Educación','Universidades',2),('Educación','Institutos',3),
    ('Educación','Academias',4),('Educación','Librerías',5),('Educación','Escuelas',6),
    ('Educación','Educación Especial',7),
    ('Energía','Energía Solar',1),('Energía','Productores de Energía',2),('Energía','Gasolina',3),
    ('Energía','Petróleo',4),('Energía','Gas',5),('Energía','Diésel',6),('Energía','Energía Renovable',7),
    ('Entretenimiento','Eventos',1),('Entretenimiento','Conciertos',2),('Entretenimiento','Obras de Teatro',3),
    ('Entretenimiento','Cines',4),('Entretenimiento','Parques de Diversiones',5),('Entretenimiento','Juguetes',6),
    ('Entretenimiento','Artistas',7),('Entretenimiento','Venues',8),('Entretenimiento','Venta de Boletos',9),
    ('Entretenimiento','Reservaciones',10),
    ('Gobierno','Municipios',1),('Gobierno','Agencias de Gobierno',2),('Gobierno','Tribunales',3),
    ('Gobierno','Capitolio',4),('Gobierno','Gobierno Central',5),('Gobierno','Gobierno Federal',6),
    ('Hogar','Mueblerías',1),('Hogar','Enseres del Hogar',2),
    ('Industria de Alimentos y Bebidas','Restaurantes',1),('Industria de Alimentos y Bebidas','Fast Food',2),
    ('Industria de Alimentos y Bebidas','Supermercados',3),('Industria de Alimentos y Bebidas','Distribuidores de Alimentos',4),
    ('Industria de Alimentos y Bebidas','Bebidas y Bebidas Alcohólicas',5),
    ('Mensajería / Entrega de Paquetes','Plataformas Digitales',1),('Mensajería / Entrega de Paquetes','Correo',2),
    ('Organizaciones sin Fines de Lucro','Fundaciones',1),
    ('Política','Partidos Políticos',1),('Política','Comité de Acción Política (PAC)',2),
    ('Puertos','Aeropuertos',1),('Puertos','Muelles',2),
    ('Religión','Iglesias',1),
    ('Salud','Hospitales',1),('Salud','Planes Médicos',2),('Salud','Farmacéuticas',3),('Salud','Cannabis',4),
    ('Salud','Equipos Médicos',5),('Salud','Laboratorios',6),('Salud','Médicos',7),('Salud','Terapia Física',8),
    ('Salud','Terapia Ocupacional',9),('Salud','Terapia del Habla',10),('Salud','Gimnasios',11),
    ('Salud','Farmacias',12),('Salud','Productos de Higiene Personal',13),('Salud','Centros de Imágenes',14),
    ('Tecnología','Equipos Electrónicos y Computadoras',1),
    ('Telecomunicaciones','Celulares',1),('Telecomunicaciones','Cable',2),('Telecomunicaciones','Internet',3),
    ('Tiendas / Centros Comerciales','Mega Tiendas',1),('Tiendas / Centros Comerciales','Tiendas de Ropa',2),
    ('Tiendas / Centros Comerciales','Tiendas de Calzado',3),('Tiendas / Centros Comerciales','Tiendas de Accesorios',4),
    ('Transporte','Taxis',1),('Transporte','Empresas de Redes de Transporte (ERT)',2),('Transporte','Entregas a Domicilio',3),
    ('Turismo y Hotelería','Hoteles',1),('Turismo y Hotelería','Airbnb',2),('Turismo y Hotelería','Paradores',3),
    ('Turismo y Hotelería','Hostales',4),('Turismo y Hotelería','Agencias de Viajes',5),
    ('Turismo y Hotelería','Aerolíneas',6),('Turismo y Hotelería','Cruceros',7)
)
INSERT INTO public.client_subcategories (category_id, name, slug, sort_order)
SELECT c.id, s.name, public.slugify(s.cat) || '--' || public.slugify(s.name), s.ord
FROM subs s
JOIN public.client_categories c ON c.slug = public.slugify(s.cat)
ON CONFLICT (slug) DO NOTHING;