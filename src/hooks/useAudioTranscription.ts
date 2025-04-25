
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/services/toastService";
import { supabase } from "@/integrations/supabase/client";
import { 
  transcribeWithAssemblyAI, 
  transcribeWithOpenAI, 
  fetchSentenceTimestamps,
  fetchUtterances, 
  TranscriptionResult 
} from "@/services/audio/transcriptionService";
import { verifyAuthentication } from "@/utils/authUtils";
import { validateAudioFile } from "@/utils/file-validation";

interface UploadedFile extends File {
  preview?: string;
}

export const useAudioTranscription = () => {
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcriptId, setTranscriptId] = useState<string | null>(null);
  
  const processAudioFile = async (
    file: UploadedFile,
    onTranscriptionComplete?: (result: TranscriptionResult) => void
  ) => {
    try {
      setIsProcessing(true);
      
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

        // Store transcript ID for potential later use
        if (data?.transcript_id) {
          setTranscriptId(data.transcript_id);
        }

        // If we don't have sentence timestamps yet but we have an ID, fetch them
        if (data?.transcript_id && (!data.sentences || data.sentences.length === 0)) {
          try {
            const sentences = await fetchSentenceTimestamps(data.transcript_id);
            if (sentences && sentences.length > 0) {
              data.sentences = sentences;
            }
          } catch (sentenceError) {
            console.error('Error fetching sentences:', sentenceError);
          }
        }

        // If we don't have speaker utterances but have an ID, fetch them
        if (data?.transcript_id && (!data.utterances || data.utterances.length === 0)) {
          try {
            const utterances = await fetchUtterances(data.transcript_id);
            if (utterances && utterances.length > 0) {
              data.utterances = utterances;
            }
          } catch (utteranceError) {
            console.error('Error fetching utterances:', utteranceError);
          }
        }

        if (onTranscriptionComplete) {
          onTranscriptionComplete(data);
        }

        toast.success("Transcripción completada", {
          description: "El archivo ha sido procesado exitosamente"
        });

        return data;

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
          throw new Error('No se pudo procesar el archivo con ningún método disponible');
        }
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
    getTranscriptId
  };
};
