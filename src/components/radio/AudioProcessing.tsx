
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useAudioTranscription } from "@/hooks/useAudioTranscription";
import { useState } from "react";

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

// Create an AudioProcessing component to be used as default export
const AudioProcessing = ({ 
  onTranscriptionChange, 
  onProcessingStateChange 
}: { 
  onTranscriptionChange: (text: string) => void;
  onProcessingStateChange: (isProcessing: boolean) => void;
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const processAudio = useAudioProcessingWithAuth();
  
  const handleFileProcess = async (file: UploadedFile) => {
    try {
      setIsProcessing(true);
      onProcessingStateChange(true);
      
      await processAudio(file, (transcription) => {
        if (transcription) {
          onTranscriptionChange(transcription);
        }
      });
      
      toast({
        title: "Audio procesado",
        description: "La transcripción del audio se ha completado correctamente",
      });
    } catch (error) {
      console.error("Error processing audio:", error);
      toast({
        title: "Error",
        description: "Hubo un problema al procesar el audio. Intente nuevamente.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      onProcessingStateChange(false);
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-card">
      <h2 className="text-2xl font-bold mb-4">Procesar Audio de Radio</h2>
      <p className="text-muted-foreground mb-4">
        Sube un archivo de audio para transcribir y analizar su contenido.
      </p>
      
      {/* File upload component would go here */}
      <div className="p-8 border-2 border-dashed rounded-lg text-center">
        <p>Implementación de carga de archivos pendiente</p>
      </div>
    </div>
  );
};

export default AudioProcessing;
