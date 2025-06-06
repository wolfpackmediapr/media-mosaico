import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/services/toastService";
import { TvTranscriptionService } from "@/services/tv/tvTranscriptionService";

interface TranscriptionMetadata {
  channel?: string;
  program?: string;
  category?: string;
  broadcastTime?: string;
  keywords?: string[];
}

export interface NewsSegment {
  headline: string;
  text: string;
  start: number;
  end: number;
  keywords?: string[];
}

export const useVideoProcessor = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [transcriptionText, setTranscriptionText] = useState("");
  const [transcriptionMetadata, setTranscriptionMetadata] = useState<TranscriptionMetadata>();
  const [transcriptionResult, setTranscriptionResult] = useState<any>(null);
  const [transcriptionId, setTranscriptionId] = useState<string | null>(null);
  const [newsSegments, setNewsSegments] = useState<NewsSegment[]>([]);
  const [assemblyId, setAssemblyId] = useState<string | null>(null);

  const processVideo = async (file: File) => {
    setIsProcessing(true);
    setProgress(0);
    console.log("Starting video processing for file:", file.name);

    try {
      // First check authentication
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw new Error('Authentication required');
      if (!user) throw new Error('Please log in to process videos');

      setProgress(5);

      // First upload the file to storage
      console.log('[VideoProcessor] Uploading file to storage');
      const timestamp = Date.now();
      const sanitizedFileName = file.name.replace(/\s+/g, '_');
      const fileName = `${user.id}/${timestamp}_${sanitizedFileName}`;

      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw new Error("Error al subir el archivo: " + uploadError.message);
      }

      setProgress(10);

      // Create a TV transcription record for this video with the storage path
      console.log('[VideoProcessor] Creating TV transcription record');
      const tvTranscription = await TvTranscriptionService.createTranscription({
        original_file_path: fileName, // Use the actual storage path
        status: 'processing',
        progress: 10
      });

      if (!tvTranscription) {
        throw new Error('Failed to create transcription record');
      }

      console.log('[VideoProcessor] Created TV transcription:', tvTranscription.id);
      setTranscriptionId(tvTranscription.id);
      
      const filePath = tvTranscription.original_file_path;
      console.log('Using file path:', filePath);

      // Updated size limit to 20MB
      if (file.size > 20 * 1024 * 1024) {
        console.log("File is larger than 20MB, converting to audio first");
        setProgress(20);

        const { data: conversionData, error: conversionError } = await supabase.functions
          .invoke('convert-to-audio', {
            body: { 
              videoPath: filePath,
              transcriptionId: tvTranscription.id
            }
          });

        if (conversionError) throw conversionError;
        console.log("Conversion response:", conversionData);

        setProgress(50);

        // Process the converted audio file
        const { data: transcriptionResult, error: processError } = await supabase.functions
          .invoke('transcribe-video', {
            body: { videoPath: conversionData.audioPath }
          });

        if (processError) throw processError;
        setProgress(90);

        if (transcriptionResult?.text) {
          // Update TV transcription record with results
          await TvTranscriptionService.updateTranscription(tvTranscription.id, {
            transcription_text: transcriptionResult.text,
            audio_file_path: conversionData.audioPath,
            status: 'completed',
            progress: 100
          });

          setTranscriptionText(transcriptionResult.text);
          setTranscriptionResult(transcriptionResult);
          
          // Store AssemblyAI ID if available
          if (transcriptionResult.assemblyId) {
            setAssemblyId(transcriptionResult.assemblyId);
          }
          
          setProgress(100);
          
          toast.success("Transcripción completada", {
            description: "El archivo ha sido transcrito exitosamente. Use 'Analizar contenido' para generar segmentos."
          });
        }
      } else {
        // For smaller files, process directly
        const { data: transcriptionResult, error: processError } = await supabase.functions
          .invoke('transcribe-video', {
            body: { videoPath: filePath }
          });

        if (processError) throw processError;

        if (transcriptionResult?.text) {
          // Update TV transcription record with results
          await TvTranscriptionService.updateTranscription(tvTranscription.id, {
            transcription_text: transcriptionResult.text,
            status: 'completed',
            progress: 100
          });

          setTranscriptionText(transcriptionResult.text);
          setTranscriptionResult(transcriptionResult);
          
          // Store AssemblyAI ID if available
          if (transcriptionResult.assemblyId) {
            setAssemblyId(transcriptionResult.assemblyId);
          }
          
          setProgress(100);
          
          toast.success("Transcripción completada", {
            description: "El archivo ha sido transcrito exitosamente. Use 'Analizar contenido' para generar segmentos."
          });
        }
      }
    } catch (error: any) {
      console.error('Error processing file:', error);
      toast.error("Error al procesar", {
        description: error.message || "No se pudo procesar el archivo. Por favor, intenta nuevamente."
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
    transcriptionResult,
    transcriptionId,
    newsSegments,
    assemblyId,
    processVideo,
    setTranscriptionText,
    setNewsSegments
  };
};
