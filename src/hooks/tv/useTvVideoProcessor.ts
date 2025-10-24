
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/services/toastService";
import { TvTranscriptionService } from "@/services/tv/tvTranscriptionService";
import { TranscriptionResult } from "@/services/audio/transcriptionService";
import { NewsSegment, TranscriptionMetadata } from '@/types/media';
import { usePersistentState } from "@/hooks/use-persistent-state";

// Re-export for backward compatibility
export type { NewsSegment, TranscriptionMetadata } from '@/types/media';

export const useTvVideoProcessor = () => {
  // Temporary processing state (not persisted)
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [assemblyId, setAssemblyId] = useState<string | null>(null);
  
  // Persistent state (survives component unmount)
  const [transcriptionText, setTranscriptionText, removeTranscriptionText] = usePersistentState<string>(
    "tv-transcription-text",
    "",
    { storage: 'sessionStorage' }
  );
  
  const [transcriptionMetadata, setTranscriptionMetadata, removeTranscriptionMetadata] = usePersistentState<TranscriptionMetadata | undefined>(
    "tv-transcription-metadata",
    undefined,
    { storage: 'sessionStorage' }
  );
  
  const [transcriptionResult, setTranscriptionResult, removeTranscriptionResult] = usePersistentState<TranscriptionResult | null>(
    "tv-transcription-result",
    null,
    { storage: 'sessionStorage' }
  );
  
  const [transcriptionId, setTranscriptionId, removeTranscriptionId] = usePersistentState<string | null>(
    "tv-transcription-id",
    null,
    { storage: 'sessionStorage' }
  );
  
  const [newsSegments, setNewsSegments, removeNewsSegments] = usePersistentState<NewsSegment[]>(
    "tv-news-segments",
    [],
    { storage: 'sessionStorage' }
  );
  
  const [analysisResults, setAnalysisResults, removeAnalysisResults] = usePersistentState<string>(
    "tv-analysis-results",
    "",
    { storage: 'sessionStorage' }
  );

  // Active processing ID for background processing persistence
  const [activeProcessingId, setActiveProcessingId, removeActiveProcessingId] = usePersistentState<string | null>(
    "tv-active-processing-id",
    null,
    { storage: 'sessionStorage' }
  );

  const processVideo = async (file: File) => {
    setIsProcessing(true);
    setProgress(0);
    // Clear previous results
    setAnalysisResults("");
    
    console.log("[TvVideoProcessor] Starting unified video processing:", file.name);

    // Declare variables in outer scope for error handling access
    let existingTranscription: any = null;
    let tvTranscription: any = null;
    let fileName = '';

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
        tvTranscription = await TvTranscriptionService.createTranscription({
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
      // This now automatically includes video compression for AI processing
      console.log('[TvVideoProcessor] Calling unified processing function (includes automatic compression)');
      
      // Determine the correct transcription ID with proper validation
      let actualTranscriptionId: string | null = null;
      
      if (skipUpload && existingTranscription?.id) {
        // For chunked uploads, use existing transcription ID
        actualTranscriptionId = existingTranscription.id;
        console.log('[TvVideoProcessor] Using existing transcription ID (chunked):', actualTranscriptionId);
      } else if (tvTranscription?.id) {
        // For new uploads, use the transcription we just created
        actualTranscriptionId = tvTranscription.id;
        console.log('[TvVideoProcessor] Using new transcription ID (assembled):', actualTranscriptionId);
      } else {
        console.error('[TvVideoProcessor] No valid transcription ID found:', {
          skipUpload,
          existingTranscriptionId: existingTranscription?.id,
          tvTranscriptionId: tvTranscription?.id,
          hasExisting: !!existingTranscription,
          hasTvTranscription: !!tvTranscription
        });
        throw new Error('No valid transcription ID could be determined. Please try uploading the video again.');
      }
      
      // Final validation before calling edge function
      if (!actualTranscriptionId) {
        throw new Error('Transcription ID is required but was not found. Please try uploading the video again.');
      }
      
      console.log('[TvVideoProcessor] Final transcription ID check:', {
        actualTranscriptionId,
        videoPath: fileName,
        skipUpload
      });
      
      // Save active processing ID for background persistence
      setActiveProcessingId(actualTranscriptionId);
      
      const { data: result, error: processError } = await supabase.functions
        .invoke('process-tv-with-gemini', {
          body: { 
            videoPath: fileName,
            transcriptionId: actualTranscriptionId
          }
        });

      if (processError) {
        console.error('[TvVideoProcessor] Processing error:', processError);
        throw new Error(`Processing failed: ${processError.message}`);
      }

      // Check if we got a 202 Accepted response (background processing)
      if (result?.status === 'processing') {
        console.log('[TvVideoProcessor] Background processing started, polling for completion...');
        setProgress(20);
        
        toast.info("Procesamiento iniciado", {
          description: "El video se está procesando en segundo plano. Esto puede tardar unos minutos..."
        });

        // Poll for completion
        await pollForProcessingCompletion(actualTranscriptionId);
        
        // After polling completes, fetch the final results
        const { data: finalTranscription, error: fetchError } = await supabase
          .from('tv_transcriptions')
          .select('*')
          .eq('id', actualTranscriptionId)
          .single();

        if (fetchError || !finalTranscription) {
          throw new Error('Failed to retrieve final transcription results');
        }

        // Set results from database
        setTranscriptionText(finalTranscription.transcription_text || '');
        setAnalysisResults(finalTranscription.full_analysis || '');
        
        // Parse transcription text into utterances for editor
        if (finalTranscription.transcription_text) {
          console.log('[TvVideoProcessor] Parsing transcription from database');
          setTranscriptionResult({
            text: finalTranscription.transcription_text,
            utterances: [], // Will be populated by useSpeakerTextState
            words: []
          });
        }
        
        setProgress(100);
        
        // Clear active processing ID on completion
        setActiveProcessingId(null);
        
        console.log('[TvVideoProcessor] Background processing completed successfully');
        
        toast.success("¡Procesamiento completado!", {
          description: "Video analizado exitosamente."
        });
        
        return; // Exit early for background processing flow
      }

      // Legacy sync response handling (if function doesn't return 202)
      if (!result?.success) {
        console.error('[TvVideoProcessor] Processing failed:', result);
        throw new Error(result?.error || 'Video processing failed');
      }

      // Set all results from unified response
      setTranscriptionText(result.transcription || '');
      setNewsSegments(result.segments || []);
      
      // Automatically set analysis results from Gemini processing
      const analysisText = result.full_analysis || result.summary || '';
      setAnalysisResults(analysisText);
      console.log('[TvVideoProcessor] Analysis automatically populated:', {
        hasFullAnalysis: !!result.full_analysis,
        hasSummary: !!result.summary,
        analysisLength: analysisText.length
      });
      
      setProgress(100);
      
      // Clear active processing ID on completion
      setActiveProcessingId(null);

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
      
      // Update transcription status to failed - use the correct transcription ID
      const failedTranscriptionId = existingTranscription?.id || tvTranscription?.id || transcriptionId;
      
      if (failedTranscriptionId) {
        try {
          await TvTranscriptionService.updateTranscription(failedTranscriptionId, {
            status: 'failed',
            progress: 100
          });
          console.log('[TvVideoProcessor] Updated transcription status to failed:', failedTranscriptionId);
        } catch (updateError) {
          console.error('[TvVideoProcessor] Failed to update error status:', updateError);
        }
      } else {
        console.warn('[TvVideoProcessor] No transcription ID available to update error status');
      }
      
      // Clear active processing ID on error
      setActiveProcessingId(null);
      
      // Display user-friendly error messages based on error type
      if (error.message?.includes('429') || error.message?.includes('RESOURCE_EXHAUSTED')) {
        toast.error("Límite temporal de API alcanzado", {
          description: "El video se procesará en 1-2 minutos. Por favor espera e intenta de nuevo.",
          duration: 10000
        });
      } else if (error.message?.includes('quota')) {
        toast.error("Cuota de procesamiento alcanzada", {
          description: "Intenta de nuevo en unos minutos.",
          duration: 8000
        });
      } else {
        toast.error("Error al procesar video", {
          description: error.message || "No se pudo procesar el archivo. Por favor, intenta nuevamente."
        });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Poll for processing completion with visibility-aware adaptive intervals
  const pollForProcessingCompletion = async (transcriptionId: string) => {
    const maxAttempts = 120; // 10 minutes max with adaptive intervals
    let attempts = 0;
    let isTabVisible = !document.hidden;
    
    // Listen for visibility changes during polling
    const handleVisibilityChange = () => {
      const wasVisible = isTabVisible;
      isTabVisible = !document.hidden;
      console.log(`[TvVideoProcessor] Tab visibility changed during polling: ${wasVisible ? 'visible' : 'hidden'} -> ${isTabVisible ? 'visible' : 'hidden'}`);
      
      if (isTabVisible && !wasVisible) {
        toast.info('Procesamiento continúa', {
          description: `El video sigue procesándose en segundo plano`,
          duration: 3000
        });
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    try {
      while (attempts < maxAttempts) {
        try {
          const { data, error } = await supabase
            .from('tv_transcriptions')
            .select('status, progress')
            .eq('id', transcriptionId)
            .single();
          
          if (error) {
            console.error('[TvVideoProcessor] Poll error:', error);
            throw new Error('Failed to check processing status');
          }
          
          console.log(`[TvVideoProcessor] Poll attempt ${attempts + 1} (tab ${isTabVisible ? 'visible' : 'hidden'}): status=${data.status}, progress=${data.progress}`);
          
          if (data.status === 'completed') {
            setProgress(100);
            return; // Success!
          }
          
          if (data.status === 'failed') {
            throw new Error('Processing failed on server');
          }
          
          // Update progress in UI
          if (data.progress) {
            setProgress(Math.min(data.progress, 95)); // Cap at 95% until truly complete
          }
          
          // Adaptive polling interval based on visibility
          const pollInterval = isTabVisible ? 5000 : 15000; // 5s visible, 15s hidden
          await new Promise(resolve => setTimeout(resolve, pollInterval));
          attempts++;
          
        } catch (error) {
          console.error('[TvVideoProcessor] Polling error:', error);
          throw error;
        }
      }
      
      // Timeout
      throw new Error('Processing timeout - the video is taking too long to process');
    } finally {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    }
  };

  // Auto-resume processing on mount if there's an active job
  useEffect(() => {
    if (activeProcessingId && !isProcessing) {
      console.log('[TvVideoProcessor] Found active processing job on mount, resuming polling:', activeProcessingId);
      
      (async () => {
        try {
          setIsProcessing(true);
          
          toast.info('Reanudando procesamiento', {
            description: 'Continuando con el video en curso...',
            duration: 3000
          });
          
          await pollForProcessingCompletion(activeProcessingId);
          
          // Fetch and display results
          const { data, error } = await supabase
            .from('tv_transcriptions')
            .select('*')
            .eq('id', activeProcessingId)
            .single();
            
          if (!error && data) {
            setTranscriptionText(data.transcription_text || '');
            setAnalysisResults(data.full_analysis || '');
            
            if (data.transcription_text) {
              setTranscriptionResult({
                text: data.transcription_text,
                utterances: [],
                words: []
              });
            }
            
            setActiveProcessingId(null);
            toast.success('¡Procesamiento completado!', {
              description: 'El video fue procesado exitosamente'
            });
          }
        } catch (error) {
          console.error('[TvVideoProcessor] Error resuming processing:', error);
          setActiveProcessingId(null);
          toast.error('Error al reanudar procesamiento', {
            description: 'Por favor intenta de nuevo'
          });
        } finally {
          setIsProcessing(false);
        }
      })();
    }
  }, []); // Only run on mount

  // Sync UI state when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (!document.hidden && transcriptionId && isProcessing) {
        console.log('[TvVideoProcessor] Tab visible - checking processing status');
        
        try {
          const { data, error } = await supabase
            .from('tv_transcriptions')
            .select('status, progress, transcription_text, full_analysis')
            .eq('id', transcriptionId)
            .single();
          
          if (!error && data) {
            // Update UI with latest data
            if (data.status === 'completed' && !transcriptionText) {
              console.log('[TvVideoProcessor] Processing completed while tab was hidden');
              setTranscriptionText(data.transcription_text || '');
              setAnalysisResults(data.full_analysis || '');
              setProgress(100);
              setActiveProcessingId(null);
              toast.success('¡Procesamiento completado mientras estabas ausente!');
            } else if (data.status === 'processing' && data.progress > progress) {
              console.log('[TvVideoProcessor] Syncing progress from background:', data.progress);
              setProgress(data.progress);
            }
          }
        } catch (error) {
          console.error('[TvVideoProcessor] Error checking processing status:', error);
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [transcriptionId, transcriptionText, progress, isProcessing]);

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
    setNewsSegments,
    // Export setters for clear functionality
    setTranscriptionId,
    setTranscriptionMetadata,
    setTranscriptionResult,
    setAnalysisResults,
    setAssemblyId,
    // Export remove functions for proper clearing
    removeTranscriptionText,
    removeTranscriptionMetadata,
    removeTranscriptionResult,
    removeTranscriptionId,
    removeNewsSegments,
    removeAnalysisResults,
    removeActiveProcessingId
  };
};
