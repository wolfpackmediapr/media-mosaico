
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/services/toastService";
import { TvTranscriptionService } from "@/services/tv/tvTranscriptionService";
import { TranscriptionResult } from "@/services/audio/transcriptionService";

export interface NewsSegment {
  headline: string;
  text: string;
  start: number;
  end: number;
  keywords?: string[];
}

interface TranscriptionMetadata {
  channel?: string;
  program?: string;
  category?: string;
  broadcastTime?: string;
  keywords?: string[];
}

export const useTvVideoProcessor = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [transcriptionText, setTranscriptionText] = useState("");
  const [transcriptionMetadata, setTranscriptionMetadata] = useState<TranscriptionMetadata>();
  const [transcriptionResult, setTranscriptionResult] = useState<TranscriptionResult | null>(null);
  const [transcriptionId, setTranscriptionId] = useState<string | null>(null);
  const [newsSegments, setNewsSegments] = useState<NewsSegment[]>([]);
  const [assemblyId, setAssemblyId] = useState<string | null>(null);

  const processVideo = async (file: File) => {
    setIsProcessing(true);
    setProgress(0);
    console.log("[TvVideoProcessor] Starting unified video processing:", file.name);

    try {
      // Check authentication
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw new Error('Authentication required');
      if (!user) throw new Error('Please log in to process videos');

      setProgress(5);
      toast.info("Iniciando procesamiento", {
        description: "Subiendo video y preparando análisis..."
      });

      // Upload file to storage
      console.log('[TvVideoProcessor] Uploading file to storage');
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

      // Create TV transcription record
      console.log('[TvVideoProcessor] Creating TV transcription record');
      const tvTranscription = await TvTranscriptionService.createTranscription({
        original_file_path: fileName,
        status: 'processing',
        progress: 10
      });

      if (!tvTranscription) {
        throw new Error('Failed to create transcription record');
      }

      console.log('[TvVideoProcessor] Created TV transcription:', tvTranscription.id);
      setTranscriptionId(tvTranscription.id);
      setProgress(15);

      toast.info("Procesando video", {
        description: "Analizando contenido con IA avanzada..."
      });

      // Call unified processing function
      console.log('[TvVideoProcessor] Calling unified processing function');
      const { data: result, error: processError } = await supabase.functions
        .invoke('process-tv-with-gemini', {
          body: { 
            videoPath: fileName,
            transcriptionId: tvTranscription.id
          }
        });

      if (processError) {
        console.error('[TvVideoProcessor] Processing error:', processError);
        throw new Error(`Processing failed: ${processError.message}`);
      }

      if (!result?.success) {
        console.error('[TvVideoProcessor] Processing failed:', result);
        throw new Error('Video processing failed');
      }

      // Set all results from unified response
      setTranscriptionText(result.transcription || '');
      setNewsSegments(result.segments || []);
      setProgress(100);

      // Create TranscriptionResult for compatibility with existing components
      if (result.utterances && Array.isArray(result.utterances)) {
        const mockTranscriptionResult: TranscriptionResult = {
          text: result.transcription,
          utterances: result.utterances.map((utterance: any) => ({
            start: utterance.start || 0,
            end: utterance.end || 1000,
            text: utterance.text || '',
            confidence: utterance.confidence || 0.95,
            speaker: utterance.speaker || 'Speaker_0',
            words: []
          })),
          words: []
        };
        setTranscriptionResult(mockTranscriptionResult);
      }

      console.log('[TvVideoProcessor] Unified processing completed successfully');
      
      toast.success("¡Procesamiento completado!", {
        description: `Video analizado exitosamente. Se generaron ${result.segments?.length || 0} segmentos de noticias.`
      });

    } catch (error: any) {
      console.error('[TvVideoProcessor] Error in unified processing:', error);
      
      // Update transcription status to failed
      if (transcriptionId) {
        try {
          await TvTranscriptionService.updateTranscription(transcriptionId, {
            status: 'failed',
            progress: 100
          });
        } catch (updateError) {
          console.error('[TvVideoProcessor] Failed to update error status:', updateError);
        }
      }
      
      toast.error("Error al procesar video", {
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
