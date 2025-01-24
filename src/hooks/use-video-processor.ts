import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface TranscriptionMetadata {
  channel?: string;
  program?: string;
  category?: string;
  broadcastTime?: string;
  keywords?: string[];
}

export const useVideoProcessor = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [transcriptionText, setTranscriptionText] = useState("");
  const [transcriptionMetadata, setTranscriptionMetadata] = useState<TranscriptionMetadata>();

  const processVideo = async (file: File) => {
    setIsProcessing(true);
    setProgress(0);

    toast({
      title: "Procesando archivo",
      description: "Transcribiendo archivo... Esto puede tardar unos momentos dependiendo del tamaño del archivo.",
    });

    try {
      const { data: transcriptionData, error: transcriptionError } = await supabase
        .from('transcriptions')
        .select('*')
        .eq('original_file_path', file.name)
        .maybeSingle();

      if (transcriptionError) throw transcriptionError;

      if (!transcriptionData) {
        throw new Error('No se encontró la transcripción para este archivo');
      }

      setTranscriptionMetadata({
        channel: transcriptionData.channel,
        program: transcriptionData.program,
        category: transcriptionData.category,
        broadcastTime: transcriptionData.broadcast_time,
        keywords: transcriptionData.keywords,
      });

      // Simulate processing progress (will be replaced with actual processing)
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setIsProcessing(false);
            setTranscriptionText("Esta es una transcripción de ejemplo del video procesado...");
            return 100;
          }
          return prev + 10;
        });
      }, 500);
    } catch (error) {
      console.error('Error processing file:', error);
      toast({
        title: "Error al procesar",
        description: error.message || "No se pudo procesar el archivo. Por favor, intenta nuevamente.",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  return {
    isProcessing,
    progress,
    transcriptionText,
    transcriptionMetadata,
    processVideo,
    setTranscriptionText,
  };
};