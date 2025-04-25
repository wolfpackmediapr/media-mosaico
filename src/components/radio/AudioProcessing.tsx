
import { toast } from "sonner";
import { useAudioTranscription } from "@/hooks/useAudioTranscription";
import { TranscriptionResult } from "@/services/audio/transcriptionService";
import { validateAudioFile } from "@/utils/file-validation";
import { useRealTimeTranscription } from "@/hooks/useRealTimeTranscription";

interface UploadedFile extends File {
  preview?: string;
}

export const processAudioFile = async (
  file: UploadedFile,
  onTranscriptionComplete?: (text: string) => void,
  onUtterancesReceived?: (result: TranscriptionResult) => void
) => {
  const { processWithAuth } = useAudioTranscription();
  
  // Validate file before processing
  if (!validateAudioFile(file)) {
    return false;
  }

  try {
    // Process with AssemblyAI with speaker diarization enabled
    const result = await processWithAuth(file, (result) => {
      console.log("[processAudioFile] Transcription result:", result);
      
      if (result.text && onTranscriptionComplete) {
        onTranscriptionComplete(result.text);
      }
      
      if (result.utterances && onUtterancesReceived) {
        onUtterancesReceived(result);
      }
    });

    return result;
  } catch (error) {
    console.error("[processAudioFile] Error:", error);
    toast.error("Error al procesar el archivo. Intente nuevamente.");
    return false;
  }
};

export const processAudioFileRealTime = async (
  file: UploadedFile,
  onTranscriptionComplete?: (text: string) => void,
  onUtterancesReceived?: (result: TranscriptionResult) => void
) => {
  // Validate file before processing
  if (!validateAudioFile(file)) {
    return false;
  }

  try {
    const { startFromFile, utterances, transcription } = useRealTimeTranscription({
      audioFile: file,
      onTranscriptionComplete,
      onUtterancesReceived: utterances => {
        if (onUtterancesReceived) {
          // Convert utterances to the expected format if needed
          const result: TranscriptionResult = {
            text: transcription,
            utterances: utterances.map(u => ({
              speaker: String(u.speaker), // Convert to string to match expected type
              text: u.text,
              start: u.start,
              end: u.end,
              words: u.words
            }))
          };
          
          onUtterancesReceived(result);
        }
      }
    });
    
    // Start processing in real-time
    await startFromFile(file);

    return true;
  } catch (error) {
    console.error("[processAudioFileRealTime] Error:", error);
    toast.error("Error al procesar el archivo en tiempo real. Intente nuevamente.");
    return false;
  }
};

export const useAudioProcessingWithAuth = () => {
  const { processWithAuth } = useAudioTranscription();
  return processWithAuth;
};

// New hook to expose real-time processing capabilities
export const useRealTimeAudioProcessing = () => {
  const {
    startFromFile,
    startFromMicrophone,
    stopTranscription,
    isProcessing,
    progress,
    transcription,
    utterances
  } = useRealTimeTranscription({});
  
  return {
    startFromFile,
    startFromMicrophone,
    stopTranscription,
    isProcessing,
    progress,
    transcription,
    utterances
  };
};
