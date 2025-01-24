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
    console.log("Starting video processing for file:", file.name);

    try {
      // First check authentication
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw new Error('Authentication required');
      if (!user) throw new Error('Please log in to process videos');

      // Set up real-time subscription for progress updates
      const subscription = supabase
        .channel('transcription-progress')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'transcriptions',
            filter: `original_file_path=eq.${file.name}`,
          },
          (payload) => {
            if (payload.new.progress) {
              setProgress(payload.new.progress);
            }
            if (payload.new.status === 'completed') {
              setIsProcessing(false);
              setProgress(100);
            }
          }
        )
        .subscribe();

      // For files larger than 25MB, convert to audio first
      if (file.size > 25 * 1024 * 1024) {
        console.log("File is larger than 25MB, converting to audio first");

        const { data: conversionData, error: conversionError } = await supabase.functions
          .invoke('convert-to-audio', {
            body: { videoPath: file.name }
          });

        if (conversionError) throw conversionError;
        console.log("Conversion response:", conversionData);

        // Process the converted audio file
        const { data: transcriptionResult, error: processError } = await supabase.functions
          .invoke('transcribe-video', {
            body: { videoPath: conversionData.audioPath }
          });

        if (processError) throw processError;

        if (transcriptionResult?.text) {
          setTranscriptionText(transcriptionResult.text);
          
          toast({
            title: "Transcripción completada",
            description: "El video ha sido transcrito exitosamente.",
          });
        }
      } else {
        // For smaller files, process directly
        const formData = new FormData();
        formData.append('file', file);
        formData.append('userId', user.id);

        const { data: transcriptionResult, error: processError } = await supabase.functions
          .invoke('secure-transcribe', {
            body: formData,
          });

        if (processError) throw processError;

        if (transcriptionResult?.text) {
          setTranscriptionText(transcriptionResult.text);
          
          toast({
            title: "Transcripción completada",
            description: "El video ha sido transcrito exitosamente.",
          });
        }
      }

      // Clean up subscription
      subscription.unsubscribe();

    } catch (error: any) {
      console.error('Error processing file:', error);
      setIsProcessing(false);
      toast({
        title: "Error al procesar",
        description: error.message || "No se pudo procesar el archivo. Por favor, intenta nuevamente.",
        variant: "destructive",
      });
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