
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

interface GeminiAnalysisResult {
  text: string;
  visual_analysis: string;
  segments: NewsSegment[];
  keywords: string[];
  summary: string;
  analysis: {
    who?: string;
    what?: string;
    when?: string;
    where?: string;
    why?: string;
  };
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
    console.log("Starting video processing for file:", file.name);

    try {
      // Check authentication
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw new Error('Authentication required');
      if (!user) throw new Error('Please log in to process videos');

      setProgress(5);

      // Upload file to storage with proper path structure
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

      setProgress(15);

      // Create TV transcription record
      console.log('[TvVideoProcessor] Creating TV transcription record');
      const tvTranscription = await TvTranscriptionService.createTranscription({
        original_file_path: fileName,
        status: 'processing',
        progress: 15
      });

      if (!tvTranscription) {
        throw new Error('Failed to create transcription record');
      }

      console.log('[TvVideoProcessor] Created TV transcription:', tvTranscription.id);
      setTranscriptionId(tvTranscription.id);
      setProgress(25);

      // Update transcription progress
      await TvTranscriptionService.updateTranscription(tvTranscription.id, {
        progress: 25,
        status: 'processing'
      });

      console.log('[TvVideoProcessor] Calling unified processing function with videoPath:', fileName);
      setProgress(35);

      // Call the unified processing function with correct file path
      const { data: result, error: processError } = await supabase.functions
        .invoke('process-tv-with-gemini', {
          body: { 
            videoPath: fileName, // Pass the correct storage path
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

      setProgress(85);

      console.log('[TvVideoProcessor] Processing completed successfully');

      // Set the transcription text and segments
      setTranscriptionText(result.text);
      setNewsSegments(result.segments || []);

      // Create a TranscriptionResult-like object for compatibility
      const mockTranscriptionResult: TranscriptionResult = {
        text: result.text,
        utterances: result.segments.map((segment, index) => ({
          start: segment.start * 1000, // Convert to ms
          end: segment.end * 1000,
          text: segment.text,
          confidence: 0.95,
          speaker: `Speaker_${index % 2}`, // Mock speaker labels
          words: []
        })),
        words: []
      };

      setTranscriptionResult(mockTranscriptionResult);
      setProgress(95);

      // Final database update
      await TvTranscriptionService.updateTranscription(tvTranscription.id, {
        transcription_text: result.text,
        status: 'completed',
        progress: 100,
        summary: result.summary,
        keywords: result.keywords
      });

      setProgress(100);
      
      toast.success("Procesamiento completado", {
        description: `Video analizado exitosamente. Se generaron ${result.segments.length} segmentos de noticias.`
      });

      console.log('[TvVideoProcessor] Processing completed successfully');

    } catch (error: any) {
      console.error('[TvVideoProcessor] Error in processing:', error);
      
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
