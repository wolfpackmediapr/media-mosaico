
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
  // NEW: Store analysis results directly from processing
  const [analysisResults, setAnalysisResults] = useState<string>("");

  const processVideo = async (file: File) => {
    setIsProcessing(true);
    setProgress(0);
    // Clear previous results
    setAnalysisResults("");
    
    console.log("[TvVideoProcessor] Starting unified video processing:", file.name);

    try {
      // Check authentication
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw new Error('Authentication required');
      if (!user) throw new Error('Please log in to process videos');

      // Check if file was already uploaded via chunks
      const normalizeFileName = (name: string) => {
        return name
          .toLowerCase()
          .replace(/\s+/g, '_')
          .replace(/[()]/g, '_')
          .replace(/_+/g, '_')
          .replace(/^_|_$/g, '');
      };
      
      const normalizedCurrentFile = normalizeFileName(file.name);
      
      // Look for existing chunked upload sessions with flexible matching
      console.log('[TvVideoProcessor] Checking for existing chunked upload sessions...');
      const { data: chunkSessions, error: sessionError } = await supabase
        .from('chunked_upload_sessions')
        .select('id, session_id, file_name, file_size, status, created_at')
        .eq('user_id', user.id)
        .eq('file_size', file.size)
        .eq('status', 'completed')
        .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Last hour
        .order('created_at', { ascending: false });

      if (sessionError) {
        console.error('[TvVideoProcessor] Error searching for chunk sessions:', sessionError);
      }

      let existingTranscription = null;
      let fileName = '';
      let skipUpload = false;

      // Find the best matching chunked upload session
      let matchingChunkSession = null;
      if (chunkSessions && chunkSessions.length > 0) {
        // Try to find exact match first, then fallback to normalized matching
        matchingChunkSession = chunkSessions.find(session => 
          normalizeFileName(session.file_name) === normalizedCurrentFile
        ) || chunkSessions[0]; // Fallback to most recent if no exact match
        
        console.log('[TvVideoProcessor] Found chunked upload session:', {
          sessionId: matchingChunkSession.session_id,
          originalFileName: matchingChunkSession.file_name,
          normalizedStored: normalizeFileName(matchingChunkSession.file_name),
          normalizedCurrent: normalizedCurrentFile,
          isExactMatch: normalizeFileName(matchingChunkSession.file_name) === normalizedCurrentFile
        });
      }
      
      if (matchingChunkSession) {
        // Look for transcription with chunked path matching this session
        const { data: chunkedTranscriptions, error: searchError } = await supabase
          .from('tv_transcriptions')
          .select('id, original_file_path, status')
          .eq('user_id', user.id)
          .like('original_file_path', `chunked:${matchingChunkSession.session_id}%`)
          .order('created_at', { ascending: false })
          .limit(1);

        if (searchError) {
          console.error('[TvVideoProcessor] Error searching for chunked transcriptions:', searchError);
        }

        if (chunkedTranscriptions && chunkedTranscriptions.length > 0) {
          existingTranscription = chunkedTranscriptions[0];
          fileName = existingTranscription.original_file_path;
          skipUpload = true;
          console.log('[TvVideoProcessor] Found existing chunked transcription:', {
            transcriptionId: existingTranscription.id,
            originalPath: fileName,
            status: existingTranscription.status,
            sessionId: matchingChunkSession.session_id
          });
        } else {
          console.log('[TvVideoProcessor] No transcription found for chunked session, will proceed with regular upload');
        }
      } else {
        console.log('[TvVideoProcessor] No completed chunked upload found for this file, proceeding with regular upload');
      }

      if (skipUpload && existingTranscription) {
        // File was already uploaded via chunks, skip upload step
        console.log('[TvVideoProcessor] Skipping upload - using existing chunked file');
        setProgress(15);
        setTranscriptionId(existingTranscription.id);
        
        toast.info("Archivo ya subido", {
          description: "Validando y preparando video..."
        });

        // Update transcription status to processing
        await TvTranscriptionService.updateTranscription(existingTranscription.id, {
          status: 'processing',
          progress: 15
        });
      } else {
        // Regular upload flow for new files
        setProgress(5);
        toast.info("Iniciando procesamiento", {
          description: "Subiendo video y preparando análisis..."
        });

        // Upload file to video storage bucket
        console.log('[TvVideoProcessor] Uploading file to video storage bucket');
        const timestamp = Date.now();
        const sanitizedFileNameForUpload = file.name.replace(/\s+/g, '_');
        fileName = `${user.id}/${timestamp}_${sanitizedFileNameForUpload}`;

        const { error: uploadError } = await supabase.storage
          .from('video')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error("Upload error:", uploadError);
          throw new Error("Error al subir el archivo: " + uploadError.message);
        }

        console.log('[TvVideoProcessor] File uploaded to video bucket:', fileName);
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
      }

      toast.info("Procesando video", {
        description: "Analizando contenido con IA avanzada..."
      });

      // Call unified processing function with correct path format
      console.log('[TvVideoProcessor] Calling unified processing function');
      const { data: result, error: processError } = await supabase.functions
        .invoke('process-tv-with-gemini', {
          body: { 
            videoPath: fileName,
            transcriptionId: existingTranscription?.id || transcriptionId
          }
        });

      if (processError) {
        console.error('[TvVideoProcessor] Processing error:', processError);
        throw new Error(`Processing failed: ${processError.message}`);
      }

      if (!result?.success) {
        console.error('[TvVideoProcessor] Processing failed:', result);
        throw new Error(result?.error || 'Video processing failed');
      }

      // Set all results from unified response
      setTranscriptionText(result.transcription || '');
      setNewsSegments(result.segments || []);
      
      // NEW: Automatically set analysis results from Gemini processing
      // Use full_analysis which should contain properly formatted content with type markers
      const analysisText = result.full_analysis || result.summary || '';
      setAnalysisResults(analysisText);
      console.log('[TvVideoProcessor] Analysis automatically populated:', {
        hasFullAnalysis: !!result.full_analysis,
        hasSummary: !!result.summary,
        analysisLength: analysisText.length
      });
      
      setProgress(100);

      // Create TranscriptionResult for compatibility
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
      } else if (result.transcription) {
        // If no utterances but we have transcription text, let the editor handle speaker parsing
        // This enables the same speaker functionality as Radio tab
        console.log('[TvVideoProcessor] No utterances from processing, will let editor parse speakers from text');
        setTranscriptionResult({
          text: result.transcription,
          utterances: [], // Will be populated by useSpeakerTextState
          words: []
        });
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
    analysisResults, // NEW: Return analysis results
    processVideo,
    setTranscriptionText,
    setNewsSegments
  };
};
