
-- Create speaker_labels table to store custom speaker names
CREATE TABLE public.speaker_labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transcription_id uuid NOT NULL,
  original_speaker text NOT NULL,
  custom_name text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(transcription_id, original_speaker, user_id)
);

-- Enable Row Level Security
ALTER TABLE public.speaker_labels ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own speaker labels" 
  ON public.speaker_labels 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own speaker labels" 
  ON public.speaker_labels 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own speaker labels" 
  ON public.speaker_labels 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own speaker labels" 
  ON public.speaker_labels 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX idx_speaker_labels_transcription_user 
  ON public.speaker_labels(transcription_id, user_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_speaker_labels_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_speaker_labels_updated_at_trigger
  BEFORE UPDATE ON public.speaker_labels
  FOR EACH ROW
  EXECUTE FUNCTION update_speaker_labels_updated_at();
