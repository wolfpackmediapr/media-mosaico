import { useQuery } from "@tanstack/react-query";
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
  return useQuery({
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
      
      // Stop polling when completed or failed
      if (!data) return false;
      if (data.status === 'completed' || data.status === 'failed') return false;
      
      // Adaptive polling based on tab visibility
      // Poll faster when visible, slower when hidden
      const isVisible = !document.hidden;
      return isVisible ? 5000 : 15000;
    },
    staleTime: 2000,
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
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
