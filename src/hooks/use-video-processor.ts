import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { TranscriptionAnalysis } from "@/types/assemblyai";

interface TranscriptionMetadata {
  channel?: string;
  program?: string;
  category?: string;
  broadcastTime?: string;
  keywords?: string[];
}

interface VideoProcessorReturn {
  isProcessing: boolean;
  progress: number;
  transcriptionText: string;
  transcriptionMetadata: TranscriptionMetadata | undefined;
  analysis: TranscriptionAnalysis | undefined;
  processVideo: (file: File) => Promise<void>;
  setTranscriptionText: React.Dispatch<React.SetStateAction<string>>;
}

export const useVideoProcessor = (): VideoProcessorReturn => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [transcriptionText, setTranscriptionText] = useState("");
  const [transcriptionMetadata, setTranscriptionMetadata] = useState<TranscriptionMetadata>();
  const [analysis, setAnalysis] = useState<TranscriptionAnalysis>();

  const processVideo = async (file: File) => {
    setIsProcessing(true);
    setProgress(0);
    console.log("Starting video processing for file:", file.name);

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw new Error('Authentication required');
      if (!user) throw new Error('Please log in to process videos');

      setProgress(10);

      if (file.size > 25 * 1024 * 1024) {
        console.log("File is larger than 25MB, converting to audio first");
        setProgress(20);

        const { data: conversionData, error: conversionError } = await supabase.functions
          .invoke('convert-to-audio', {
            body: { videoPath: file.name }
          });

        if (conversionError) throw conversionError;
        console.log("Conversion response:", conversionData);

        setProgress(50);

        const { data: transcriptionResult, error: processError } = await supabase.functions
          .invoke('transcribe-video', {
            body: { videoPath: conversionData.audioPath }
          });

        if (processError) throw processError;
        setProgress(90);

        if (transcriptionResult?.text) {
          setTranscriptionText(transcriptionResult.text);
          if (transcriptionResult.analysis) {
            setAnalysis(transcriptionResult.analysis);
          }
          setProgress(100);
          
          toast({
            title: "Transcripción completada",
            description: "El video ha sido transcrito exitosamente.",
          });
        }
      } else {
        const { data: transcriptionResult, error: processError } = await supabase.functions
          .invoke('transcribe-video', {
            body: { videoPath: file.name }
          });

        if (processError) throw processError;

        if (transcriptionResult?.text) {
          setTranscriptionText(transcriptionResult.text);
          if (transcriptionResult.analysis) {
            setAnalysis(transcriptionResult.analysis);
          }
          setProgress(100);
          
          toast({
            title: "Transcripción completada",
            description: "El video ha sido transcrito exitosamente.",
          });
        }
      }
    } catch (error: any) {
      console.error('Error processing file:', error);
      toast({
        title: "Error al procesar",
        description: error.message || "No se pudo procesar el archivo. Por favor, intenta nuevamente.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    isProcessing,
    progress,
    transcriptionText,
    transcriptionMetadata,
    analysis,
    processVideo,
    setTranscriptionText,
  };
};