-- Enable Realtime for tv_transcriptions so the UI receives push updates
-- when full_analysis is populated AFTER status is already 'completed'.
ALTER TABLE public.tv_transcriptions REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'tv_transcriptions'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.tv_transcriptions';
  END IF;
END $$;