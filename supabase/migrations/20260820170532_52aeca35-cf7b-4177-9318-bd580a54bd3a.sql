-- Phase 1 support: track radio transcription jobs
ALTER TABLE public.radio_transcriptions
  ADD COLUMN IF NOT EXISTS status text,
  ADD COLUMN IF NOT EXISTS progress integer,
  ADD COLUMN IF NOT EXISTS error_message text;

-- Existing rows are all finished work; mark them so UI never treats them as pending.
UPDATE public.radio_transcriptions
SET status = 'completed', progress = 100
WHERE status IS NULL;

ALTER TABLE public.radio_transcriptions
  ALTER COLUMN status SET DEFAULT 'completed',
  ALTER COLUMN progress SET DEFAULT 100;

CREATE INDEX IF NOT EXISTS idx_radio_transcriptions_status
  ON public.radio_transcriptions (status)
  WHERE status <> 'completed';

-- Live progress for the radio job row
ALTER TABLE public.radio_transcriptions REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'radio_transcriptions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.radio_transcriptions;
  END IF;
END $$;

-- Phase 3: sweeper for TV jobs that never reach a terminal status
CREATE OR REPLACE FUNCTION public.sweep_stale_tv_transcriptions(p_stale_minutes integer DEFAULT 45)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_count integer;
BEGIN
  WITH swept AS (
    UPDATE public.tv_transcriptions
    SET status = 'failed:stale',
        updated_at = now()
    WHERE status IN ('uploaded', 'processing')
      AND COALESCE(updated_at, created_at) < now() - make_interval(mins => p_stale_minutes)
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM swept;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.sweep_stale_tv_transcriptions(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sweep_stale_tv_transcriptions(integer) TO service_role;

-- Backfill the currently stranded rows
SELECT public.sweep_stale_tv_transcriptions(45);

-- Run every 15 minutes
SELECT cron.unschedule('sweep-stale-tv-transcriptions')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sweep-stale-tv-transcriptions');

SELECT cron.schedule(
  'sweep-stale-tv-transcriptions',
  '*/15 * * * *',
  $$SELECT public.sweep_stale_tv_transcriptions(45);$$
);