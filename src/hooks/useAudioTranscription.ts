
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/services/toastService";
import { supabase } from "@/integrations/supabase/client";
import { 
  transcribeWithOpenAI, 
  fetchSentenceTimestamps,
  fetchUtterances, 
  TranscriptionResult 
} from "@/services/audio/transcriptionService";
import { validateAudioFile } from "@/utils/file-validation";

interface UploadedFile extends File {
  preview?: string;
}

// Human-readable Spanish reasons for each terminal failure status.
const FAILURE_MESSAGES: Record<string, string> = {
  "failed:timeout": "La transcripción tardó demasiado y se canceló. Intente con un archivo más corto.",
  "failed:empty_transcript": "No se detectó voz en el audio. Verifique el archivo e intente nuevamente.",
  "failed:assemblyai_error": "El servicio de transcripción no está disponible en este momento.",
  "failed:db_error": "La transcripción se completó pero no se pudo guardar. Intente nuevamente.",
  "failed": "No se pudo completar la transcripción.",
};

export const describeTranscriptionFailure = (status?: string | null, errorMessage?: string | null) => {
  if (errorMessage) return errorMessage;
  if (status && FAILURE_MESSAGES[status]) return FAILURE_MESSAGES[status];
  return FAILURE_MESSAGES["failed"];
};

const POLL_INTERVAL_MS = 4000;
const MAX_POLL_MS = 15 * 60 * 1000;

/**
 * Follows a background transcription job row until it reaches a terminal status.
 */
const waitForJob = async (
  jobId: string,
  onProgress?: (progress: number) => void
): Promise<TranscriptionResult> => {
  const startedAt = Date.now();

  while (Date.now() - startedAt < MAX_POLL_MS) {
    const { data, error } = await supabase
      .from("radio_transcriptions")
      .select("id, status, progress, error_message, transcription_text, analysis_result")
      .eq("id", jobId)
      .maybeSingle();

    if (error) {
      console.error("[useAudioTranscription] Error polling job:", error);
    }

    if (data) {
      const status = (data as any).status as string | null;

      if (typeof (data as any).progress === "number") {
        onProgress?.((data as any).progress);
      }

      if (status === "completed") {
        const analysis = ((data as any).analysis_result ?? {}) as any;
        return {
          text: (data as any).transcription_text ?? "",
          transcript_id: jobId,
          utterances: analysis?.utterances ?? [],
          entities: analysis?.entities,
          content_safety: analysis?.content_safety,
          topics: analysis?.topics,
        } as TranscriptionResult;
      }

      if (status && status.startsWith("failed")) {
        throw new Error(describeTranscriptionFailure(status, (data as any).error_message));
      }
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  throw new Error(FAILURE_MESSAGES["failed:timeout"]);
};

export const useAudioTranscription = () => {
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [transcriptId, setTranscriptId] = useState<string | null>(null);
  
  const processAudioFile = async (
    file: UploadedFile,
    onTranscriptionComplete?: (result: TranscriptionResult) => void
  ) => {
    try {
      setIsProcessing(true);
      setProgress(0);
      
      // Verify user authentication and get user ID
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error("AUTH_REQUIRED");
      }

      // Validate file
      if (!validateAudioFile(file)) {
        return null;
      }

      console.log('Processing file:', {
        name: file.name,
        size: file.size,
        type: file.type,
        userId: user.id
      });

      // Create FormData and append file and user ID
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', user.id);

      // Try primary transcription service (AssemblyAI)
      try {
        const { data, error } = await supabase.functions.invoke('transcribe-audio', {
          body: formData,
          headers: {
            'Accept': 'application/json',
          },
        });

        if (error) {
          console.error('Transcription error:', error);
          throw error;
        }
        
        if (!data) {
          throw new Error('No data received from transcription service');
        }

        if (data.success === false) {
          throw new Error(describeTranscriptionFailure(data.status, data.error));
        }

        let result: TranscriptionResult = data;

        // The job is still running in the background: follow the job row until
        // it reaches a terminal status instead of losing the work.
        if (data.status === 'processing' && data.job_id) {
          console.log('[useAudioTranscription] Job running in background:', data.job_id);
          setTranscriptId(data.job_id);
          toast.info("Transcripción en progreso", {
            description: "El archivo es largo y se está procesando en segundo plano."
          });
          result = await waitForJob(data.job_id, setProgress);
        }

        setProgress(100);

        // Store transcript ID for potential later use
        const resolvedId = (result as any)?.transcription_id ?? result?.transcript_id ?? data?.job_id;
        if (resolvedId) {
          setTranscriptId(resolvedId);
        }

        // If we don't have sentence timestamps yet but we have an ID, fetch them
        if (result?.transcript_id && (!result.sentences || result.sentences.length === 0)) {
          try {
            const sentences = await fetchSentenceTimestamps(result.transcript_id);
            if (sentences && sentences.length > 0) {
              result.sentences = sentences;
            }
          } catch (sentenceError) {
            // Non-fatal: timestamps are an enhancement, not the transcript.
            console.error('Error fetching sentences:', sentenceError);
          }
        }

        // If we don't have speaker utterances but have an ID, fetch them
        if (result?.transcript_id && (!result.utterances || result.utterances.length === 0)) {
          try {
            const utterances = await fetchUtterances(result.transcript_id);
            if (utterances && utterances.length > 0) {
              result.utterances = utterances;
            }
          } catch (utteranceError) {
            // Non-fatal: fall back to the plain transcript.
            console.error('Error fetching utterances:', utteranceError);
          }
        }

        if (onTranscriptionComplete) {
          onTranscriptionComplete(result);
        }

        toast.success("Transcripción completada", {
          description: "El archivo ha sido procesado exitosamente"
        });

        return result;

      } catch (transcriptionError) {
        console.error('Primary transcription failed, attempting fallback:', transcriptionError);
        // Try fallback transcription service (OpenAI)
        try {
          const fallbackResult = await transcribeWithOpenAI(formData);
          if (fallbackResult?.text) {
            if (onTranscriptionComplete) {
              onTranscriptionComplete(fallbackResult);
            }
            toast.success("Transcripción completada (método alternativo)", {
              description: "El archivo ha sido procesado usando un método alternativo"
            });
            return fallbackResult;
          }
        } catch (fallbackError) {
          console.error('Fallback transcription failed:', fallbackError);
        }

        // Surface the original, specific reason rather than a generic message.
        throw transcriptionError instanceof Error
          ? transcriptionError
          : new Error('No se pudo procesar el archivo con ningún método disponible');
      }

    } catch (error: any) {
      console.error('Error processing file:', error);
      
      if (error.message === "AUTH_REQUIRED") {
        throw error;
      }
      
      toast.error("Error", {
        description: error.message || "No se pudo procesar el archivo. Por favor, intenta nuevamente."
      });
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };
  
  const processWithAuth = async (
    file: UploadedFile,
    onTranscriptionComplete?: (result: TranscriptionResult) => void
  ) => {
    try {
      const result = await processAudioFile(file, onTranscriptionComplete);
      return result;
    } catch (error: any) {
      if (error.message === "AUTH_REQUIRED") {
        sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
        navigate('/auth');
        return null;
      }
      throw error;
    }
  };
  
  const getTranscriptId = () => transcriptId;
  
  return { 
    processWithAuth,
    isProcessing,
    progress,
    getTranscriptId
  };
};
