-- Fix categories table column reference issue
-- The logs show "column categories.name does not exist" error
-- Use name_es directly in queries instead of trying to create a computed column

-- First, let's clean up any stuck processing records
UPDATE tv_transcriptions 
SET status = 'failed', 
    progress = 0,
    updated_at = now()
WHERE status IN ('processing', 'uploading', 'analyzing') 
  AND created_at < now() - INTERVAL '1 hour';

-- Add proper indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tv_transcriptions_status ON tv_transcriptions(status);
CREATE INDEX IF NOT EXISTS idx_tv_transcriptions_user_id_status ON tv_transcriptions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_categories_name_es ON categories(name_es);