import { useState, useEffect } from "react";
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
  const [currentTranscriptionId, setCurrentTranscriptionId] = useState<string | null>(null);

  useEffect(() => {
    if (!currentTranscriptionId) return;

    const channel = supabase
      .channel('transcription-progress')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'transcriptions',
          filter: `id=eq.${currentTranscriptionId}`,
        },
        (payload) => {
          console.log('Received progress update:', payload);
          if (payload.new.progress !== undefined) {
            setProgress(payload.new.progress);
          }
          if (payload.new.status === 'completed') {
            setIsProcessing(false);
            setProgress(100);
            setTranscriptionText(payload.new.transcription_text || "");
            toast({
              title: "Procesamiento completado",
              description: "El archivo ha sido procesado exitosamente.",
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentTranscriptionId]);

  const processVideo = async (file: File) => {
    setIsProcessing(true);
    setProgress(0);
    console.log("Starting video processing for file:", file.name);

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw new Error('Authentication required');
      if (!user) throw new Error('Please log in to process videos');

      // Create initial transcription record
      const { data: transcription, error: insertError } = await supabase
        .from('transcriptions')
        .insert({
          user_id: user.id,
          original_file_path: file.name,
          status: 'pending',
          progress: 0
        })
        .select()
        .single();

      if (insertError) throw insertError;
      
      setCurrentTranscriptionId(transcription.id);

      // For files larger than 25MB, convert to audio first
      if (file.size > 25 * 1024 * 1024) {
        console.log("File is larger than 25MB, converting to audio first");

        const { data: conversionData, error: conversionError } = await supabase.functions
          .invoke('convert-to-audio', {
            body: { videoPath: file.name, transcriptionId: transcription.id }
          });

        if (conversionError) throw conversionError;
        console.log("Conversion response:", conversionData);

        // Process the converted audio file
        const { data: transcriptionResult, error: processError } = await supabase.functions
          .invoke('transcribe-video', {
            body: { videoPath: conversionData.audioPath, transcriptionId: transcription.id }
          });

        if (processError) throw processError;

        if (transcriptionResult?.text) {
          setTranscriptionText(transcriptionResult.text);
        }
      } else {
        // For smaller files, process directly
        const formData = new FormData();
        formData.append('file', file);
        formData.append('userId', user.id);
        formData.append('transcriptionId', transcription.id);

        const { data: transcriptionResult, error: processError } = await supabase.functions
          .invoke('secure-transcribe', {
            body: formData,
          });

        if (processError) throw processError;

        if (transcriptionResult?.text) {
          setTranscriptionText(transcriptionResult.text);
        }
      }

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