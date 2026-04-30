import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TranscriptionStatus {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number | null;
  transcription_text: string | null;
  full_analysis: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * React Query-based hook for polling TV transcription status
 * Provides automatic polling with visibility-aware intervals
 */
export const useTranscriptionPolling = (transcriptionId: string | null, enabled: boolean = true) => {
  const queryClient = useQueryClient();
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['tv-transcription-status', transcriptionId],
    queryFn: async (): Promise<TranscriptionStatus | null> => {
      if (!transcriptionId) return null;
      
      console.log('[useTranscriptionPolling] Fetching status for:', transcriptionId);
      
      const { data, error } = await supabase
        .from('tv_transcriptions')
        .select('id, status, progress, transcription_text, full_analysis, created_at, updated_at')
        .eq('id', transcriptionId)
        .maybeSingle();
      
      if (error) {
        console.error('[useTranscriptionPolling] Error fetching status:', error);
        throw error;
      }
      
      if (!data) {
        console.log('[useTranscriptionPolling] No transcription found for ID:', transcriptionId);
        return null;
      }
      
      console.log('[useTranscriptionPolling] Status:', data.status, 'Progress:', data.progress);
      
      return data as TranscriptionStatus;
    },
    enabled: !!transcriptionId && enabled,
    refetchInterval: (query) => {
      const data = query.state.data as TranscriptionStatus | null | undefined;

      if (!data) return false;
      if (data.status === 'failed') return false;

      const isVisible = !document.hidden;

      // Hard timeout (10 min) since record was created — give up waiting
      // for late-arriving analysis to avoid endless polling.
      const HARD_TIMEOUT_MS = 10 * 60 * 1000;
      const elapsedMs = Date.now() - new Date(data.created_at).getTime();

      if (data.status === 'completed') {
        // Transcription is in but the analysis stage (analyze-tv-stored)
        // writes full_analysis a few minutes later. Keep polling slowly
        // so the UI picks it up even if Realtime drops the update.
        if (!data.full_analysis && elapsedMs < HARD_TIMEOUT_MS) {
          return isVisible ? 8000 : 20000;
        }
        // Analysis present, or we've waited long enough.
        return false;
      }

      // Still transcribing — adaptive polling based on tab visibility.
      return isVisible ? 5000 : 15000;
    },
    staleTime: 2000,
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });

  // Determine whether the analysis stage has timed out for this row.
  const data = query.data;
  const HARD_TIMEOUT_MS = 10 * 60 * 1000;
  const elapsedMs = data ? Date.now() - new Date(data.created_at).getTime() : 0;
  const analysisTimedOut =
    !!data &&
    data.status === 'completed' &&
    !data.full_analysis &&
    elapsedMs >= HARD_TIMEOUT_MS;

  const retryAnalysis = useCallback(async (idOverride?: string) => {
    const id = idOverride || transcriptionId;
    if (!id) return { ok: false, error: 'No transcription ID' };

    setRetryError(null);
    setRetrying(true);
    try {
      console.log('[useTranscriptionPolling] Retrying analyze-tv-stored for', id);
      const { error } = await supabase.functions.invoke('analyze-tv-stored', {
        body: { transcriptionId: id },
      });
      if (error) throw error;

      // Resume polling: invalidate so refetchInterval re-engages immediately.
      await queryClient.invalidateQueries({
        queryKey: ['tv-transcription-status', id],
      });
      return { ok: true };
    } catch (err: any) {
      const message = err?.message || String(err);
      console.error('[useTranscriptionPolling] retryAnalysis failed:', message);
      setRetryError(message);
      return { ok: false, error: message };
    } finally {
      setRetrying(false);
    }
  }, [transcriptionId, queryClient]);

  return Object.assign(query, {
    analysisTimedOut,
    retryAnalysis,
    isRetryingAnalysis: retrying,
    retryAnalysisError: retryError,
  });
};

/**
 * Hook to check if processing is taking too long
 */
export const useProcessingTimeout = (
  transcriptionId: string | null,
  isProcessing: boolean,
  timeoutMs: number = 15 * 60 * 1000 // 15 minutes default
) => {
  const { data } = useTranscriptionPolling(transcriptionId, isProcessing);
  
  if (!data || !isProcessing) return { isTimedOut: false, elapsedMs: 0 };
  
  const createdAt = new Date(data.created_at).getTime();
  const now = Date.now();
  const elapsedMs = now - createdAt;
  
  return {
    isTimedOut: elapsedMs > timeoutMs,
    elapsedMs,
    elapsedMinutes: Math.floor(elapsedMs / 60000)
  };
};
