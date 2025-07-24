
-- Add full_analysis field to tv_transcriptions table for storing formatted content with type markers
ALTER TABLE tv_transcriptions ADD COLUMN IF NOT EXISTS full_analysis TEXT;

-- Add analysis_content_summary field if it doesn't exist (for backward compatibility)
ALTER TABLE tv_transcriptions ADD COLUMN IF NOT EXISTS analysis_content_summary TEXT;

-- Add analysis_keywords field if it doesn't exist (for backward compatibility)
ALTER TABLE tv_transcriptions ADD COLUMN IF NOT EXISTS analysis_keywords TEXT[];
