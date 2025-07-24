-- Clean up stuck processing records
UPDATE tv_transcriptions 
SET status = 'failed', 
    error = 'Reset for reprocessing',
    progress = 0
WHERE status IN ('processing', 'pending') 
  AND created_at < NOW() - INTERVAL '10 minutes';