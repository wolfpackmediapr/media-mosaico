-- 1. Junction table
CREATE TABLE public.client_subcategory_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  client_subcategory_id uuid NOT NULL REFERENCES public.client_subcategories(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT client_subcategory_assignments_unique UNIQUE (client_id, client_subcategory_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_subcategory_assignments TO authenticated;
GRANT ALL ON public.client_subcategory_assignments TO service_role;

ALTER TABLE public.client_subcategory_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY client_subcategory_assignments_select
  ON public.client_subcategory_assignments FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY client_subcategory_assignments_write
  ON public.client_subcategory_assignments FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE INDEX idx_csa_client ON public.client_subcategory_assignments(client_id);
CREATE INDEX idx_csa_subcategory ON public.client_subcategory_assignments(client_subcategory_id);

-- 2. Aliases column (separate from keywords)
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS aliases text[] NOT NULL DEFAULT '{}';

-- 3. Validation: assignment subcategory must belong to the client's primary category
CREATE OR REPLACE FUNCTION public.validate_client_subcategory_assignment()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_client_category uuid;
  v_sub_category uuid;
BEGIN
  SELECT client_category_id INTO v_client_category FROM public.clients WHERE id = NEW.client_id;
  SELECT category_id INTO v_sub_category FROM public.client_subcategories WHERE id = NEW.client_subcategory_id;

  IF v_client_category IS NULL THEN
    RAISE EXCEPTION 'El cliente no tiene una categoria principal asignada; asigne la categoria antes de anadir subcategorias.';
  END IF;

  IF v_sub_category IS DISTINCT FROM v_client_category THEN
    RAISE EXCEPTION 'La subcategoria seleccionada no pertenece a la categoria principal del cliente.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_client_subcategory_assignment
  BEFORE INSERT OR UPDATE ON public.client_subcategory_assignments
  FOR EACH ROW EXECUTE FUNCTION public.validate_client_subcategory_assignment();

-- 4. Block primary category change while incompatible assignments remain
CREATE OR REPLACE FUNCTION public.validate_client_category_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_bad integer;
BEGIN
  IF NEW.client_category_id IS DISTINCT FROM OLD.client_category_id THEN
    SELECT count(*) INTO v_bad
    FROM public.client_subcategory_assignments a
    JOIN public.client_subcategories s ON s.id = a.client_subcategory_id
    WHERE a.client_id = NEW.id
      AND s.category_id IS DISTINCT FROM NEW.client_category_id;

    IF v_bad > 0 THEN
      RAISE EXCEPTION 'No se puede cambiar la categoria principal: quedan % subcategoria(s) incompatibles asignadas.', v_bad;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_client_category_change
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.validate_client_category_change();

-- 5. Idempotent backfill of existing single subcategory selections
INSERT INTO public.client_subcategory_assignments (client_id, client_subcategory_id)
SELECT id, client_subcategory_id
FROM public.clients
WHERE client_subcategory_id IS NOT NULL
ON CONFLICT (client_id, client_subcategory_id) DO NOTHING;

-- 6. Transactional classification update
CREATE OR REPLACE FUNCTION public.update_client_classification(
  p_client_id uuid,
  p_client_category_id uuid,
  p_subcategory_ids uuid[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ids uuid[] := COALESCE(p_subcategory_ids, '{}'::uuid[]);
  v_invalid integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autorizado: se requiere una sesion activa.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.clients WHERE id = p_client_id) THEN
    RAISE EXCEPTION 'Cliente no encontrado.';
  END IF;

  IF p_client_category_id IS NULL THEN
    RAISE EXCEPTION 'La categoria principal del cliente es obligatoria.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.client_categories WHERE id = p_client_category_id) THEN
    RAISE EXCEPTION 'La categoria principal indicada no existe.';
  END IF;

  SELECT count(*) INTO v_invalid
  FROM unnest(v_ids) AS req(id)
  LEFT JOIN public.client_subcategories s ON s.id = req.id
  WHERE s.id IS NULL OR s.category_id IS DISTINCT FROM p_client_category_id;

  IF v_invalid > 0 THEN
    RAISE EXCEPTION 'Hay % subcategoria(s) que no pertenecen a la categoria seleccionada.', v_invalid;
  END IF;

  DELETE FROM public.client_subcategory_assignments
  WHERE client_id = p_client_id
    AND NOT (client_subcategory_id = ANY (v_ids));

  UPDATE public.clients
  SET client_category_id = p_client_category_id
  WHERE id = p_client_id;

  INSERT INTO public.client_subcategory_assignments (client_id, client_subcategory_id)
  SELECT p_client_id, id FROM unnest(v_ids) AS t(id)
  ON CONFLICT (client_id, client_subcategory_id) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.update_client_classification(uuid, uuid, uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_client_classification(uuid, uuid, uuid[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.update_client_classification(uuid, uuid, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_client_classification(uuid, uuid, uuid[]) TO service_role;