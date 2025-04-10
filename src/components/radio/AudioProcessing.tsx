
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useAudioTranscription } from "@/hooks/useAudioTranscription";

interface UploadedFile extends File {
  preview?: string;
}

export const processAudioFile = async (
  file: UploadedFile,
  onTranscriptionComplete?: (text: string) => void
) => {
  const { processWithAuth } = useAudioTranscription();
  return processWithAuth(file, onTranscriptionComplete);
};

// Helper function to handle auth redirection from components
export const useAudioProcessingWithAuth = () => {
  const { processWithAuth } = useAudioTranscription();
  return processWithAuth;
};
