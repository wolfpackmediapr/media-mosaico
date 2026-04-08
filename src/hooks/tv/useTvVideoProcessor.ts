
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
  const PROCESSING_STALE_TIMEOUT_MS = 5 * 60 * 1000;
  const STALE_PROCESSING_MESSAGE = 'El procesamiento dejó de responder. Intenta de nuevo.';
  
  // Cooldown: prevent rapid re-submissions that exhaust Gemini quota
  const [lastSubmitTime, setLastSubmitTime] = useState<number>(0);
  const COOLDOWN_MS = 60000; // 60 seconds between video submissions
  
  // HYBRID FIX: Keep critical data persistent (survives page refresh)
  const [transcriptionText, setTranscriptionText, removeTranscriptionText] = usePersistentState<string>(
    "tv-transcription-text",
    "",
    { storage: 'sessionStorage' }
  );
  
  const [transcriptionId, setTranscriptionId, removeTranscriptionId] = usePersistentState<string | null>(
    "tv-transcription-id",
    null,
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
  
  // HYBRID FIX: Convert transient/derived data to plain useState (like Radio)
  // These are either derived from transcriptionText or complex objects that cause serialization issues
  const [transcriptionMetadata, setTranscriptionMetadata] = useState<TranscriptionMetadata | undefined>(undefined);
  const [transcriptionResult, setTranscriptionResult] = useState<TranscriptionResult | null>(null);
  const [newsSegments, setNewsSegments] = useState<NewsSegment[]>([]);
  
  // Provide no-op remove functions for backward compatibility
  const removeTranscriptionMetadata = () => setTranscriptionMetadata(undefined);
  const removeTranscriptionResult = () => setTranscriptionResult(null);
  const removeNewsSegments = () => setNewsSegments([]);

  const markTranscriptionAsStale = async (targetTranscriptionId: string) => {
    const staleReason = 'Stale job detected after 5 minutes without status or progress changes.';

    const { error } = await supabase
      .from('tv_transcriptions')
      .update({
        status: 'failed:stale',
        progress: 0,
        provider_fallback_reason: staleReason,
      })
      .eq('id', targetTranscriptionId);

    if (error) {
      console.error('[TvVideoProcessor] Failed to mark stale transcription:', error);
      return;
    }

    console.warn('[TvVideoProcessor] Marked transcription as stale:', targetTranscriptionId);
  };

  const processVideo = async (file: File, onFilePathResolved?: (publicUrl: string) => void) => {
    // Cooldown check: prevent rapid re-submissions
    const now = Date.now();
    if (now - lastSubmitTime < COOLDOWN_MS) {
      const waitSeconds = Math.ceil((COOLDOWN_MS - (now - lastSubmitTime)) / 1000);
      toast.error(`Espera ${waitSeconds}s antes de procesar otro video`, {
        description: "El límite de la API requiere un tiempo de espera entre envíos.",
        duration: 5000
      });
      return;
    }
    setLastSubmitTime(now);
    
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
        .select('id, session_id, file_name, file_size, status, created_at, assembled_file_path, playback_type, manifest_created, total_chunks')
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
        
        // For chunked uploads, we need to ensure a single assembled file exists in storage
        // before calling the Qwen edge function (which needs a single video URL).
        const rawFileName = matchingChunkSession!.file_name.replace(/\s+/g, '_');
        const baseFileName = rawFileName.includes('/') ? rawFileName.split('/').pop()! : rawFileName;
        
        let chunkedFilePath = matchingChunkSession!.assembled_file_path;
        
        // If no assembled file exists (manifest-based large uploads), reassemble client-side
        if (!chunkedFilePath && matchingChunkSession!.playback_type === 'chunked' && matchingChunkSession!.manifest_created) {
          console.log('[TvVideoProcessor] Manifest-based chunked upload detected — reassembling client-side...');
          toast.info("Ensamblando video", {
            description: "Combinando fragmentos del video. Esto puede tardar 1-3 minutos..."
          });
          
          const totalChunks = matchingChunkSession!.total_chunks;
          const sessionId = matchingChunkSession!.session_id;
          const chunkBlobs: Blob[] = [];
          
          for (let i = 0; i < totalChunks; i++) {
            const chunkPath = `chunks/${sessionId}/chunk_${String(i).padStart(4, '0')}`;
            const { data: signedUrlData, error: signedUrlErr } = await supabase.storage
              .from('video')
              .createSignedUrl(chunkPath, 600);
            
            if (signedUrlErr || !signedUrlData?.signedUrl) {
              throw new Error(`No se pudo obtener URL firmada para chunk ${i}: ${signedUrlErr?.message}`);
            }
            
            const chunkResponse = await fetch(signedUrlData.signedUrl);
            if (!chunkResponse.ok) {
              throw new Error(`Error descargando chunk ${i}: HTTP ${chunkResponse.status}`);
            }
            
            chunkBlobs.push(await chunkResponse.blob());
            const reassemblyProgress = Math.round(5 + (i / totalChunks) * 8); // 5-13% range
            setProgress(reassemblyProgress);
            console.log(`[TvVideoProcessor] Downloaded chunk ${i + 1}/${totalChunks}`);
          }
          
          // Concatenate all chunks into a single Blob
          const assembledBlob = new Blob(chunkBlobs, { type: 'video/mp4' });
          console.log(`[TvVideoProcessor] Assembled blob: ${(assembledBlob.size / 1024 / 1024).toFixed(1)}MB`);
          
          // Upload to video bucket
          const assembledPath = `${sessionId}/${baseFileName}`;
          const { error: uploadErr } = await supabase.storage
            .from('video')
            .upload(assembledPath, assembledBlob, {
              cacheControl: '3600',
              upsert: true
            });
          
          if (uploadErr) {
            throw new Error(`Error subiendo video ensamblado: ${uploadErr.message}`);
          }
          
          // Update DB so we don't reassemble again
          await supabase
            .from('chunked_upload_sessions')
            .update({ assembled_file_path: assembledPath })
            .eq('session_id', sessionId);
          
          chunkedFilePath = assembledPath;
          console.log('[TvVideoProcessor] Client-side reassembly complete:', chunkedFilePath);
          toast.success("Video ensamblado", { description: "Continuando con el análisis..." });
        }
        
        // Fallback path construction if still no assembled path
        if (!chunkedFilePath) {
          chunkedFilePath = `${matchingChunkSession!.session_id}/${baseFileName}`;
        }
        
        console.log('[TvVideoProcessor] Resolved chunked file path:', { chunkedFilePath, assembledFilePath: matchingChunkSession!.assembled_file_path, baseFileName });
        fileName = chunkedFilePath;
        const { data: { publicUrl: chunkedPublicUrl } } = supabase.storage
          .from('video')
          .getPublicUrl(chunkedFilePath);
        
        sessionStorage.setItem('tv-uploaded-video-url', chunkedPublicUrl);
        sessionStorage.setItem('tv-uploaded-video-filename', file.name);
        console.log('[TvVideoProcessor] Stored chunked video public URL:', chunkedPublicUrl);
        
        // Notify caller so the video player can switch to the permanent URL
        if (onFilePathResolved) {
          console.log('[TvVideoProcessor] Notifying caller of resolved chunked file path');
          onFilePathResolved(chunkedPublicUrl);
        }
        
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
        
        // FIX: Get the public URL and store it in sessionStorage
        // This allows the video player to use the permanent URL after navigation
        const { data: { publicUrl } } = supabase.storage
          .from('video')
          .getPublicUrl(fileName);
        
        console.log('[TvVideoProcessor] Public URL for uploaded video:', publicUrl);
        
        // Store the permanent URL in sessionStorage for persistence
        sessionStorage.setItem('tv-uploaded-video-url', publicUrl);
        sessionStorage.setItem('tv-uploaded-video-filename', file.name);
        
        // Notify caller so the video player can switch to the permanent URL
        if (onFilePathResolved) {
          console.log('[TvVideoProcessor] Notifying caller of resolved file path');
          onFilePathResolved(publicUrl);
        }
        
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
        description: "Analizando contenido con IA..."
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
        .invoke('process-tv-with-qwen', {
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
        
        // FIX: Fetch final results with retry to ensure data is available
        let finalTranscription = null;
        let fetchAttempts = 0;
        const maxFetchAttempts = 3;
        
        while (fetchAttempts < maxFetchAttempts && !finalTranscription?.transcription_text) {
          const { data, error: fetchError } = await supabase
            .from('tv_transcriptions')
            .select('*')
            .eq('id', actualTranscriptionId)
            .single();

          if (fetchError) {
            console.error('[TvVideoProcessor] Fetch attempt failed:', fetchError);
          } else if (data?.transcription_text) {
            finalTranscription = data;
            break;
          }
          
          fetchAttempts++;
          if (fetchAttempts < maxFetchAttempts) {
            console.log(`[TvVideoProcessor] Retry fetch attempt ${fetchAttempts + 1}/${maxFetchAttempts}`);
            await new Promise(r => setTimeout(r, 1000));
          }
        }

        if (!finalTranscription) {
          throw new Error('Failed to retrieve final transcription results');
        }

        // FIX: Explicitly set and verify transcription state
        const transcriptionData = finalTranscription.transcription_text || '';
        const analysisData = finalTranscription.full_analysis || '';
        
        console.log('[TvVideoProcessor] Setting transcription text:', {
          length: transcriptionData.length,
          preview: transcriptionData.substring(0, 100),
          hasAnalysis: !!analysisData
        });
        
        setTranscriptionText(transcriptionData);
        setAnalysisResults(analysisData);
        
        // Parse transcription text into utterances for editor
        if (transcriptionData) {
          console.log('[TvVideoProcessor] Parsing transcription from database');
          setTranscriptionResult({
            text: transcriptionData,
            utterances: [], // Will be populated by useSpeakerTextState
            words: []
          });
        }
        
        setProgress(100);
        
        // Clear active processing ID on completion
        setActiveProcessingId(null);
        
        console.log('[TvVideoProcessor] Background processing completed successfully', {
          transcriptionLength: transcriptionData.length,
          analysisLength: analysisData.length
        });
        
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
      const analysisText = result.full_analysis || (result.analysis ? JSON.stringify(result.analysis) : '') || result.summary || '';
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
          const { data: currentTranscription, error: currentStatusError } = await supabase
            .from('tv_transcriptions')
            .select('status')
            .eq('id', failedTranscriptionId)
            .single();

          if (currentStatusError) {
            console.error('[TvVideoProcessor] Failed to check current transcription status:', currentStatusError);
          }

          const currentStatus = currentTranscription?.status;
          const hasTerminalStatus = currentStatus === 'completed' || currentStatus === 'failed' || currentStatus?.startsWith('failed:');

          if (!hasTerminalStatus) {
            await TvTranscriptionService.updateTranscription(failedTranscriptionId, {
              status: 'failed',
              progress: 100
            });
            console.log('[TvVideoProcessor] Updated transcription status to failed:', failedTranscriptionId);
          } else {
            console.log('[TvVideoProcessor] Preserving terminal transcription status:', currentStatus);
          }
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
    const maxAttempts = 360; // 30 minutes max with adaptive intervals for large files
    let attempts = 0;
    let isTabVisible = !document.hidden;
    let lastObservedStatus: string | null = null;
    let lastObservedProgress: number | null = null;
    let lastStateChangeAt = Date.now();
    
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
            .select('status, progress, updated_at, provider_fallback_reason')
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
          
          if (data.status === 'failed' || data.status?.startsWith('failed:')) {
            const backendReason = data.provider_fallback_reason || '';
            const failureType = data.status;
            
            if (failureType === 'failed:quota_exhausted') {
              throw new Error('Ambas llaves API alcanzaron el límite de cuota. Por favor espera 60 segundos e intenta de nuevo.');
            } else if (failureType === 'failed:memory_limit') {
              throw new Error('El archivo es demasiado grande para procesar. Intenta con un video más corto.');
            } else if (failureType === 'failed:timeout') {
              throw new Error('El procesamiento tardó demasiado. Intenta con un video más corto.');
            } else if (failureType === 'failed:stale' || failureType === 'failed:runtime') {
              throw new Error(STALE_PROCESSING_MESSAGE);
            } else if (backendReason) {
              throw new Error(`Error del servidor: ${backendReason.substring(0, 200)}`);
            } else {
              throw new Error('Processing failed on server');
            }
          }

          const hasStateChanged = data.status !== lastObservedStatus || data.progress !== lastObservedProgress;
          if (hasStateChanged) {
            lastObservedStatus = data.status;
            lastObservedProgress = data.progress;
            lastStateChangeAt = Date.now();
          } else {
            const updatedAtMs = data.updated_at ? new Date(data.updated_at).getTime() : null;
            const staleElapsedMs = Math.max(
              Date.now() - lastStateChangeAt,
              updatedAtMs ? Date.now() - updatedAtMs : 0
            );

            if (staleElapsedMs >= PROCESSING_STALE_TIMEOUT_MS) {
              console.warn('[TvVideoProcessor] Detected stale TV processing job:', {
                transcriptionId,
                status: data.status,
                progress: data.progress,
                staleElapsedMs,
              });
              await markTranscriptionAsStale(transcriptionId);
              throw new Error(STALE_PROCESSING_MESSAGE);
            }
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

  // FIX: Auto-resume processing on mount if there's an active job
  // Include activeProcessingId in dependencies to properly trigger resume
  useEffect(() => {
    if (activeProcessingId && !isProcessing) {
      console.log('[TvVideoProcessor] Found active processing job, resuming polling:', activeProcessingId);
      
      (async () => {
        try {
          setIsProcessing(true);
          
          toast.info('Reanudando procesamiento', {
            description: 'Continuando con el video en curso...',
            duration: 3000
          });
          
          await pollForProcessingCompletion(activeProcessingId);
          
          // FIX: Fetch and display results with retry
          let data = null;
          let fetchAttempts = 0;
          const maxAttempts = 3;
          
          while (fetchAttempts < maxAttempts && !data?.transcription_text) {
            const result = await supabase
              .from('tv_transcriptions')
              .select('*')
              .eq('id', activeProcessingId)
              .single();
              
            if (!result.error && result.data?.transcription_text) {
              data = result.data;
              break;
            }
            fetchAttempts++;
            if (fetchAttempts < maxAttempts) {
              await new Promise(r => setTimeout(r, 1000));
            }
          }
            
          if (data) {
            console.log('[TvVideoProcessor] Resume: Setting transcription text:', {
              length: data.transcription_text?.length || 0,
              hasAnalysis: !!data.full_analysis
            });
            
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
          } else {
            throw new Error('No se pudo obtener los resultados de la transcripción');
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
  }, [activeProcessingId]); // FIX: Include activeProcessingId to properly trigger resume
  
  // FIX: Restore transcription from database on mount if we have ID but no text
  useEffect(() => {
    const restoreFromDatabase = async () => {
      // Only restore if we have an ID but no text (and not currently processing)
      if (transcriptionId && !transcriptionText && !isProcessing && !activeProcessingId) {
        console.log('[TvVideoProcessor] Restoring transcription from database:', transcriptionId);
        
        try {
          const { data, error } = await supabase
            .from('tv_transcriptions')
            .select('transcription_text, full_analysis, status')
            .eq('id', transcriptionId)
            .single();
          
          if (!error && data?.status === 'completed' && data.transcription_text) {
            console.log('[TvVideoProcessor] Restored transcription from DB:', {
              length: data.transcription_text.length,
              hasAnalysis: !!data.full_analysis
            });
            
            setTranscriptionText(data.transcription_text);
            setAnalysisResults(data.full_analysis || '');
            
            setTranscriptionResult({
              text: data.transcription_text,
              utterances: [],
              words: []
            });
          } else if (data?.status === 'processing') {
            // If still processing, set the active processing ID to resume polling
            console.log('[TvVideoProcessor] Found processing job in DB, setting active ID');
            setActiveProcessingId(transcriptionId);
          }
        } catch (error) {
          console.error('[TvVideoProcessor] Error restoring from database:', error);
        }
      }
    };
    
    restoreFromDatabase();
  }, [transcriptionId, transcriptionText, isProcessing, activeProcessingId]);

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
