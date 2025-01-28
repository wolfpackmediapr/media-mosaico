import { corsHeaders } from './cors.ts';

interface TranscriptionConfig {
  audio_url: string;
  language_detection: boolean;
  speaker_labels: boolean;
  content_safety: boolean;
  entity_detection: boolean;
  iab_categories: boolean;
  redact_pii: boolean;
  redact_pii_audio: boolean;
  redact_pii_policies: string[];
  auto_punctuation: boolean;
}

export const uploadToAssemblyAI = async (audioData: ArrayBuffer): Promise<string> => {
  console.log('Uploading to AssemblyAI...');
  const uploadResponse = await fetch('https://api.assemblyai.com/v2/upload', {
    method: 'POST',
    headers: {
      'Authorization': Deno.env.get('ASSEMBLYAI_API_KEY') ?? '',
    },
    body: audioData,
  });

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    console.error('AssemblyAI upload error:', errorText);
    throw new Error(`Failed to upload to AssemblyAI: ${errorText}`);
  }

  const { upload_url } = await uploadResponse.json();
  console.log('File uploaded to AssemblyAI:', upload_url);
  return upload_url;
};

export const startTranscription = async (audioUrl: string): Promise<string> => {
  console.log('Starting transcription for URL:', audioUrl);
  
  const transcriptionConfig: TranscriptionConfig = {
    audio_url: audioUrl,
    language_detection: true,
    speaker_labels: true,
    content_safety: true,
    entity_detection: true,
    iab_categories: true,
    redact_pii: true,
    redact_pii_audio: true,
    redact_pii_policies: [
      "drug",
      "email",
      "location",
      "medical",
      "number",
      "person",
      "phone_number",
      "url",
      "us_social_security_number"
    ],
    auto_punctuation: true
  };

  const response = await fetch('https://api.assemblyai.com/v2/transcript', {
    method: 'POST',
    headers: {
      'Authorization': Deno.env.get('ASSEMBLYAI_API_KEY') ?? '',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(transcriptionConfig),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('AssemblyAI transcription error:', errorText);
    throw new Error(`Failed to start transcription: ${errorText}`);
  }

  const { id: transcriptId } = await response.json();
  console.log('Transcription started with ID:', transcriptId);
  return transcriptId;
};

export const pollTranscription = async (transcriptId: string) => {
  console.log('Polling transcription status for ID:', transcriptId);
  while (true) {
    const response = await fetch(
      `https://api.assemblyai.com/v2/transcript/${transcriptId}`,
      {
        headers: {
          'Authorization': Deno.env.get('ASSEMBLYAI_API_KEY') ?? '',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AssemblyAI polling error:', errorText);
      throw new Error(`Transcription polling failed: ${errorText}`);
    }

    const result = await response.json();
    console.log('Polling status:', result.status);

    if (result.status === 'completed') {
      return result;
    } else if (result.status === 'error') {
      throw new Error(`Transcription failed: ${result.error}`);
    }

    // Wait before polling again
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
};