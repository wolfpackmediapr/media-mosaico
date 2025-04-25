import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
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
      
      // Check authentication first
      const user = await verifyAuthentication();
      
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

      console.log('Sending request to transcribe with formData:', {
        fileName: file.name,
        fileSize: file.size,
        userId: user.id
      });

      // Try primary transcription service (AssemblyAI)
      try {
        const data = await transcribeWithAssemblyAI(formData);
        
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
            // Non-fatal, continue without sentences
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
            // Non-fatal, continue without utterances
          }
        }
        
        onTranscriptionComplete?.(data);
        
        toast({
          title: "Transcripción completada",
          description: "El archivo ha sido procesado exitosamente con AssemblyAI",
        });
        return data;
      } catch (assemblyError) {
        console.error('AssemblyAI transcription failed, falling back to OpenAI:', assemblyError);
      }

      // Fallback to OpenAI Whisper
      try {
        const data = await transcribeWithOpenAI(formData);
        onTranscriptionComplete?.(data);
        toast({
          title: "Transcripción completada",
          description: "El archivo ha sido procesado exitosamente con OpenAI Whisper",
        });
        return data;
      } catch (openaiError) {
        console.error('OpenAI transcription failed:', openaiError);
        throw openaiError;
      }
    } catch (error: any) {
      console.error('Error processing file:', error);
      
      // Special handling for authentication errors
      if (error.message === "AUTH_REQUIRED") {
        throw error;
      }
      
      toast({
        title: "Error",
        description: error.message || "No se pudo procesar el archivo. Por favor, intenta nuevamente.",
        variant: "destructive",
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
      await processAudioFile(file, onTranscriptionComplete);
      return true;
    } catch (error: any) {
      if (error.message === "AUTH_REQUIRED") {
        // Store the current path to return after login
        sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
        navigate('/auth');
        return false;
      }
      // Let other errors bubble up
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
