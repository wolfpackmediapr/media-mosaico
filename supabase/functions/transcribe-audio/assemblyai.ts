interface TranscriptionConfig {
  audio_url: string;
  language_code: string;
  content_safety: boolean;
  entity_detection: boolean;
  iab_categories: boolean;
  speaker_labels: boolean;
}

export const uploadToAssemblyAI = async (audioData: ArrayBuffer): Promise<string> => {
  console.log('Starting AssemblyAI upload...');
  const response = await fetch('https://api.assemblyai.com/v2/upload', {
    method: 'POST',
    headers: {
      'Authorization': Deno.env.get('ASSEMBLYAI_API_KEY') ?? '',
      'Content-Type': 'application/json',
    },
    body: audioData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Upload error:', errorText);
    throw new Error(`Failed to upload audio file: ${errorText}`);
  }

  const { upload_url } = await response.json();
  console.log('Audio uploaded successfully:', upload_url);
  return upload_url;
};

export const startTranscription = async (audioUrl: string): Promise<string> => {
  console.log('Starting transcription for:', audioUrl);

  const transcriptionConfig: TranscriptionConfig = {
    audio_url: audioUrl,
    language_code: 'es',
    content_safety: true,
    entity_detection: true,
    iab_categories: true,
    speaker_labels: true
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
    console.error('Transcription error:', errorText);
    throw new Error(`Failed to start transcription: ${errorText}`);
  }

  const { id } = await response.json();
  console.log('Transcription started with ID:', id);
  return id;
};

export const pollTranscription = async (transcriptId: string): Promise<any> => {
  console.log('Polling transcription status for ID:', transcriptId);
  const maxAttempts = 60; // 3 minutes with 3-second intervals
  let attempts = 0;

  while (attempts < maxAttempts) {
    const response = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
      headers: {
        'Authorization': Deno.env.get('ASSEMBLYAI_API_KEY') ?? '',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Polling error:', errorText);
      throw new Error(`Failed to poll transcription status: ${errorText}`);
    }

    const result = await response.json();
    console.log('Transcription status:', result.status);

    if (result.status === 'completed') {
      return result;
    } else if (result.status === 'error') {
      throw new Error(`Transcription failed: ${result.error}`);
    }

    attempts++;
    // Wait 3 seconds before polling again
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  throw new Error('Transcription timed out after 3 minutes');
};