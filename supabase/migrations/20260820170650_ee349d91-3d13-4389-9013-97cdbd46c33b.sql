CREATE OR REPLACE FUNCTION public.sweep_stale_tv_transcriptions(p_stale_minutes integer DEFAULT 45)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_count integer;
BEGIN
  -- A TV job is "stale" when it is neither completed nor already terminal-failed
  -- and it has not been touched for p_stale_minutes. In-progress rows carry
  -- free-text status strings (e.g. "Streaming video to Gemini..."), so match by
  -- exclusion rather than by an explicit list.
  WITH swept AS (
    UPDATE public.tv_transcriptions
    SET status = 'failed:stale',
        updated_at = now()
    WHERE status IS DISTINCT FROM 'completed'
      AND status NOT LIKE 'failed%'
      AND COALESCE(updated_at, created_at) < now() - make_interval(mins => p_stale_minutes)
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM swept;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.sweep_stale_tv_transcriptions(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sweep_stale_tv_transcriptions(integer) FROM anon;
REVOKE ALL ON FUNCTION public.sweep_stale_tv_transcriptions(integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.sweep_stale_tv_transcriptions(integer) TO service_role;

SELECT public.sweep_stale_tv_transcriptions(45);