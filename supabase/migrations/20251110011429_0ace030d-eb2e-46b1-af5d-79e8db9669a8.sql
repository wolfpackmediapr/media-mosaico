-- Add compression tracking columns to pdf_processing_jobs table
ALTER TABLE pdf_processing_jobs 
ADD COLUMN IF NOT EXISTS compressed_file_path TEXT,
ADD COLUMN IF NOT EXISTS original_size_bytes BIGINT,
ADD COLUMN IF NOT EXISTS compressed_size_bytes BIGINT,
ADD COLUMN IF NOT EXISTS compression_ratio NUMERIC(5,2);