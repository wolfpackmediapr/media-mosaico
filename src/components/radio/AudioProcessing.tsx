
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useAudioTranscription } from "@/hooks/useAudioTranscription";
import { TranscriptionResult } from "@/services/audio/transcriptionService";

interface UploadedFile extends File {
  preview?: string;
}

export const processAudioFile = async (
  file: UploadedFile,
  onTranscriptionComplete?: (text: string) => void
) => {
  const { processWithAuth } = useAudioTranscription();
  
  // Wrap the callback to convert TranscriptionResult to text string
  return processWithAuth(file, result => {
    if (onTranscriptionComplete) {
      onTranscriptionComplete(result.text);
    }
  });
};

// Helper function to handle auth redirection from components
export const useAudioProcessingWithAuth = () => {
  const { processWithAuth } = useAudioTranscription();
  return processWithAuth;
};
