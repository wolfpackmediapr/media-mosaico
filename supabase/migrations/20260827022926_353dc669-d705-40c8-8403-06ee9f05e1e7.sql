ALTER TABLE public.radio_transcriptions
  ADD COLUMN IF NOT EXISTS full_analysis text,
  ADD COLUMN IF NOT EXISTS analysis_summary text,
  ADD COLUMN IF NOT EXISTS analysis_quien text,
  ADD COLUMN IF NOT EXISTS analysis_que text,
  ADD COLUMN IF NOT EXISTS analysis_cuando text,
  ADD COLUMN IF NOT EXISTS analysis_donde text,
  ADD COLUMN IF NOT EXISTS analysis_porque text,
  ADD COLUMN IF NOT EXISTS analysis_category text,
  ADD COLUMN IF NOT EXISTS analysis_keywords text[],
  ADD COLUMN IF NOT EXISTS analysis_client_relevance jsonb;

CREATE INDEX IF NOT EXISTS idx_radio_transcriptions_analysis_category
  ON public.radio_transcriptions (analysis_category)
  WHERE analysis_category IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_radio_transcriptions_created_at
  ON public.radio_transcriptions (created_at DESC);