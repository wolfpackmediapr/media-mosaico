
import { toast } from "sonner";
import { useAudioTranscription } from "@/hooks/useAudioTranscription";
import { TranscriptionResult } from "@/services/audio/transcriptionService";
import { validateAudioFile } from "@/utils/file-validation";

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

export const useAudioProcessingWithAuth = () => {
  const { processWithAuth } = useAudioTranscription();
  return processWithAuth;
};
