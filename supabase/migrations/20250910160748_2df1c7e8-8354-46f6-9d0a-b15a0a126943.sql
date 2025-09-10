-- Add compression tracking columns to tv_transcriptions
ALTER TABLE public.tv_transcriptions
ADD COLUMN IF NOT EXISTS was_compressed BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS compressed_path TEXT;

-- Helpful index for querying compressed records
CREATE INDEX IF NOT EXISTS idx_tv_transcriptions_was_compressed
  ON public.tv_transcriptions (was_compressed);

-- No RLS changes needed; existing policies apply to new columns.