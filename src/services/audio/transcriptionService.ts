
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface TranscriptionResult {
  text: string;
  content_safety?: any;
  entities?: any;
  topics?: any;
  words?: WordTimestamp[];
  sentences?: SentenceTimestamp[];
  audio_duration?: number;
  transcript_id?: string; // Added to fix the missing property errors
  segments?: any[]; // Added to fix the missing property errors
}

export interface WordTimestamp {
  text: string;
  start: number;
  end: number;
  confidence?: number;
}

export interface SentenceTimestamp {
  text: string;
  start: number;
  end: number;
  confidence?: number;
  words?: WordTimestamp[];
}

/**
 * Transcribe audio with AssemblyAI
 */
export const transcribeWithAssemblyAI = async (
  formData: FormData
): Promise<TranscriptionResult> => {
  console.log('Attempting transcription with AssemblyAI...');
  
  const { data, error } = await supabase.functions.invoke('transcribe-audio', {
    body: formData,
    headers: {
      'Accept': 'application/json',
    },
  });

  if (error) {
    console.error('AssemblyAI transcription error:', error);
    throw new Error(error.message || "Error with AssemblyAI transcription");
  }

  if (data?.text) {
    console.log('AssemblyAI transcription successful');
    return data;
  }
  
  console.warn('No text received from AssemblyAI, falling back to OpenAI');
  throw new Error("No text received from AssemblyAI");
};

/**
 * Transcribe audio with OpenAI (fallback method)
 */
export const transcribeWithOpenAI = async (
  formData: FormData
): Promise<TranscriptionResult> => {
  console.log('Attempting transcription with OpenAI Whisper...');
  
  const { data, error } = await supabase.functions.invoke('secure-transcribe', {
    body: formData,
    headers: {
      'Accept': 'application/json',
    },
  });

  if (error) {
    console.error('OpenAI transcription error:', error);
    throw new Error(error.message || "Error al procesar la transcripción con OpenAI");
  }

  if (data?.text) {
    console.log('OpenAI transcription successful');
    return data;
  }
  
  throw new Error("No se recibió texto de transcripción de OpenAI");
};

/**
 * Fetch sentence-level timestamps from AssemblyAI
 */
export const fetchSentenceTimestamps = async (transcriptId: string): Promise<SentenceTimestamp[]> => {
  try {
    console.log('Fetching sentence-level timestamps from AssemblyAI...');
    
    const { data, error } = await supabase.functions.invoke('fetch-sentences', {
      body: { transcriptId },
      headers: {
        'Accept': 'application/json',
      },
    });

    if (error) {
      console.error('Error fetching sentences:', error);
      throw error;
    }

    if (data?.sentences && Array.isArray(data.sentences)) {
      console.log(`Retrieved ${data.sentences.length} sentences with timestamps`);
      return data.sentences;
    }
    
    return [];
  } catch (error) {
    console.error('Failed to fetch sentence timestamps:', error);
    return [];
  }
};
