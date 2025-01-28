import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const ASSEMBLYAI_API_KEY = Deno.env.get('ASSEMBLYAI_API_KEY');
if (!ASSEMBLYAI_API_KEY) {
  throw new Error('Missing ASSEMBLYAI_API_KEY environment variable');
}

export async function startTranscription(audioUrl: string) {
  const response = await fetch('https://api.assemblyai.com/v2/transcript', {
    method: 'POST',
    headers: {
      'Authorization': ASSEMBLYAI_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      audio_url: audioUrl,
      language_detection: true,
      speaker_labels: true,
      entity_detection: true,
      iab_categories: true,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to start transcription: ${JSON.stringify(error)}`);
  }

  const data = await response.json();
  return data.id;
}

export async function getTranscriptionResult(transcriptId: string) {
  const response = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
    headers: {
      'Authorization': ASSEMBLYAI_API_KEY,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to get transcription result: ${JSON.stringify(error)}`);
  }

  return await response.json();
}

export async function updateTranscriptionStatus(
  supabaseUrl: string,
  supabaseKey: string,
  transcriptionId: string,
  status: string,
  progress: number,
  text?: string,
  error?: string
) {
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  const updates: any = {
    status,
    progress,
  };

  if (text) {
    updates.transcription_text = text;
  }

  const { error: updateError } = await supabase
    .from('transcriptions')
    .update(updates)
    .eq('id', transcriptionId);

  if (updateError) {
    throw new Error(`Failed to update transcription status: ${updateError.message}`);
  }
}