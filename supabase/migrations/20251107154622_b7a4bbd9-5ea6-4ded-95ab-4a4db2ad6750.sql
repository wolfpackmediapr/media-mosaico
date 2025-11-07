-- Add document_summary field to pdf_processing_jobs table
ALTER TABLE pdf_processing_jobs 
ADD COLUMN IF NOT EXISTS document_summary TEXT;