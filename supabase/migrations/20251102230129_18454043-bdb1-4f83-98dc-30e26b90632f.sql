-- Create table for tracking individual PDF batch processing tasks
CREATE TABLE IF NOT EXISTS pdf_batch_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES pdf_processing_jobs(id) ON DELETE CASCADE,
  batch_number INTEGER NOT NULL,
  start_page INTEGER NOT NULL,
  end_page INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'error')),
  progress INTEGER DEFAULT 0,
  clippings_count INTEGER DEFAULT 0,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(job_id, batch_number)
);

-- Add indexes for efficient querying
CREATE INDEX idx_batch_tasks_job_status ON pdf_batch_tasks(job_id, status);
CREATE INDEX idx_batch_tasks_pending ON pdf_batch_tasks(status) WHERE status = 'pending';

-- Enable Row Level Security
ALTER TABLE pdf_batch_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view batch tasks for their own jobs
CREATE POLICY "Users can view own batch tasks"
  ON pdf_batch_tasks FOR SELECT
  USING (
    job_id IN (
      SELECT id FROM pdf_processing_jobs WHERE user_id = auth.uid()
    )
  );

-- RLS Policy: Users can insert batch tasks for their own jobs
CREATE POLICY "Users can insert own batch tasks"
  ON pdf_batch_tasks FOR INSERT
  WITH CHECK (
    job_id IN (
      SELECT id FROM pdf_processing_jobs WHERE user_id = auth.uid()
    )
  );

-- RLS Policy: Users can update batch tasks for their own jobs
CREATE POLICY "Users can update own batch tasks"
  ON pdf_batch_tasks FOR UPDATE
  USING (
    job_id IN (
      SELECT id FROM pdf_processing_jobs WHERE user_id = auth.uid()
    )
  );