DROP FUNCTION IF EXISTS public.update_client_classification(uuid, uuid, uuid[]);

CREATE FUNCTION public.update_client_classification(
  p_client_id uuid,
  p_client_category_id uuid,
  p_subcategory_ids uuid[]
)
RETURNS TABLE(client_id uuid, client_category_id uuid, subcategory_ids uuid[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_ids uuid[] := COALESCE(p_subcategory_ids, '{}'::uuid[]);
  v_locked uuid;
  v_invalid integer;
BEGIN
  -- 1. Lock the client row (also proves it exists).
  SELECT c.id INTO v_locked
  FROM public.clients c
  WHERE c.id = p_client_id
  FOR UPDATE;

  IF v_locked IS NULL THEN
    RAISE EXCEPTION 'Cliente no encontrado.';
  END IF;

  -- 2. Authorization: actor is always derived from the session, never from input.
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autorizado: se requiere una sesion activa.';
  END IF;

  IF p_client_category_id IS NULL THEN
    RAISE EXCEPTION 'La categoria principal del cliente es obligatoria.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.client_categories WHERE id = p_client_category_id) THEN
    RAISE EXCEPTION 'La categoria principal indicada no existe.';
  END IF;

  -- 3. Every requested subcategory must belong to the requested category.
  SELECT count(*) INTO v_invalid
  FROM unnest(v_ids) AS req(id)
  LEFT JOIN public.client_subcategories s ON s.id = req.id
  WHERE s.id IS NULL OR s.category_id IS DISTINCT FROM p_client_category_id;

  IF v_invalid > 0 THEN
    RAISE EXCEPTION 'Hay % subcategoria(s) que no pertenecen a la categoria seleccionada.', v_invalid;
  END IF;

  -- 4. Remove obsolete and incompatible assignments.
  DELETE FROM public.client_subcategory_assignments a
  WHERE a.client_id = p_client_id
    AND NOT (a.client_subcategory_id = ANY (v_ids));

  -- 5. Update the primary category.
  UPDATE public.clients
  SET client_category_id = p_client_category_id
  WHERE id = p_client_id;

  -- 6. Insert requested assignments.
  INSERT INTO public.client_subcategory_assignments (client_id, client_subcategory_id)
  SELECT p_client_id, t.id FROM unnest(v_ids) AS t(id)
  ON CONFLICT (client_id, client_subcategory_id) DO NOTHING;

  -- 7. Return the saved classification.
  RETURN QUERY
  SELECT
    c.id,
    c.client_category_id,
    COALESCE(
      (SELECT array_agg(a.client_subcategory_id ORDER BY a.client_subcategory_id)
       FROM public.client_subcategory_assignments a
       WHERE a.client_id = c.id),
      '{}'::uuid[]
    )
  FROM public.clients c
  WHERE c.id = p_client_id;

  -- 8. Any RAISE above aborts the function and rolls back steps 4-6 together.
END;
$function$;

REVOKE ALL ON FUNCTION public.update_client_classification(uuid, uuid, uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_client_classification(uuid, uuid, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_client_classification(uuid, uuid, uuid[]) TO service_role;