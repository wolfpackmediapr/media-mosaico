import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

interface TranscriptionRecord {
  user_id: string;
  original_file_path: string;
  transcription_text: string;
  status: string;
  progress: number;
  assembly_content_safety: any;
  assembly_entities: any;
  assembly_topics: any;
  language: string;
  redacted_audio_url: string;
}

export const saveTranscription = async (data: TranscriptionRecord) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const { error } = await supabase
    .from('transcriptions')
    .insert(data);

  if (error) {
    console.error('Error updating transcription:', error);
    throw new Error('Failed to update transcription record');
  }
};