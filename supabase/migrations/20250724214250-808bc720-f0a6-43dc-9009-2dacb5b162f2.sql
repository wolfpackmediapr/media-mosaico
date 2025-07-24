-- Update session status tracking to include assembled file path
ALTER TABLE chunked_upload_sessions 
ADD COLUMN IF NOT EXISTS assembled_file_path TEXT;

-- Update any completed sessions to have proper assembled file paths
UPDATE chunked_upload_sessions 
SET assembled_file_path = session_id || '/' || file_name
WHERE status = 'completed' AND assembled_file_path IS NULL;

-- Clean up any stuck transcriptions older than 10 minutes
UPDATE tv_transcriptions 
SET status = 'failed',
    progress = 0,
    error_message = 'Processing timeout - session cleanup'
WHERE status IN ('processing', 'pending') 
  AND created_at < NOW() - INTERVAL '10 minutes';