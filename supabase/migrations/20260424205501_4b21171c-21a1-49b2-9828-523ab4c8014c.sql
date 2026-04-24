ALTER TABLE public.tv_transcriptions
ADD COLUMN IF NOT EXISTS speaker_id_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS speaker_id_method text,
ADD COLUMN IF NOT EXISTS speaker_id_error text;

COMMENT ON COLUMN public.tv_transcriptions.speaker_id_status IS 'Status of speaker identification: pending | success | failed | skipped';
COMMENT ON COLUMN public.tv_transcriptions.speaker_id_method IS 'Method used: text-only | vision-keyframes | vision-video';
COMMENT ON COLUMN public.tv_transcriptions.speaker_id_error IS 'Error message if speaker identification failed';