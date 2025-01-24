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

    try {
      // First, find the transcription record by file name
      const { data: transcriptionData, error: transcriptionError } = await supabase
        .from('transcriptions')
        .select('*')
        .eq('original_file_path', file.name)
        .maybeSingle();

      if (transcriptionError) throw transcriptionError;

      if (!transcriptionData) {
        // If no transcription exists, start the transcription process
        setProgress(10);
        
        const { data: transcriptionResult, error: processError } = await supabase.functions
          .invoke('transcribe-video', {
            body: { videoPath: file.name }
          });

        if (processError) throw processError;

        setProgress(50);

        if (transcriptionResult?.text) {
          // Update the transcription record with the result
          const { error: updateError } = await supabase
            .from('transcriptions')
            .update({ 
              transcription_text: transcriptionResult.text,
              status: 'completed'
            })
            .eq('original_file_path', file.name);

          if (updateError) throw updateError;

          setTranscriptionText(transcriptionResult.text);
          setProgress(100);
          
          toast({
            title: "Transcripción completada",
            description: "El video ha sido transcrito exitosamente.",
          });
        }
      } else {
        // If transcription exists, load it
        setTranscriptionText(transcriptionData.transcription_text || "");
        setTranscriptionMetadata({
          channel: transcriptionData.channel,
          program: transcriptionData.program,
          category: transcriptionData.category,
          broadcastTime: transcriptionData.broadcast_time,
          keywords: transcriptionData.keywords,
        });
        setProgress(100);
      }
    } catch (error) {
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
    processVideo,
    setTranscriptionText,
  };
};