
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePersistentState } from "@/hooks/use-persistent-state";

interface UseTvAnalysisDisplayProps {
  transcriptionId?: string;
  forceRefresh?: boolean;
}

export const useTvAnalysisDisplay = ({
  transcriptionId,
  forceRefresh
}: UseTvAnalysisDisplayProps) => {
  // Persist analysis per-transcription so it survives remounts and navigation
  // (mirrors RadioAnalysis's usePersistentState pattern).
  const persistKey = `tv-content-analysis-${transcriptionId || "draft"}`;
  const [existingAnalysis, setExistingAnalysis, removeExistingAnalysis] =
    usePersistentState<string>(persistKey, "", { storage: "sessionStorage" });
  const [isLoading, setIsLoading] = useState(false);
  const pollStartedAtRef = useRef<number | null>(null);

  const hasAnalysis = !!existingAnalysis;
  // Treat any persisted, non-empty analysis as "full" — once we land it we
  // stop polling. This is OK because every successful write below comes from
  // full_analysis or an authoritative summary fallback.
  const hasFullAnalysis = !!existingAnalysis;
  const hasFullAnalysisRef = useRef(hasFullAnalysis);
  hasFullAnalysisRef.current = hasFullAnalysis;

  const fetchExistingAnalysis = useCallback(async (options?: { silent?: boolean }) => {
    if (!transcriptionId) return false;

    if (!options?.silent) setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('tv_transcriptions')
        .select('full_analysis, analysis_content_summary, summary, analysis_keywords')
        .eq('id', transcriptionId)
        .single();

      if (error) {
        console.error('[useTvAnalysisDisplay] Error fetching analysis:', error);
        return false;
      }

      if (data) {
        // Prioritize full_analysis (has complete structured data), then analysis_content_summary, then summary
        const analysisContent = data.full_analysis || 
                               data.analysis_content_summary || 
                               data.summary || 
                               "";

        if (analysisContent) {
          setExistingAnalysis(analysisContent);
        }
        console.log('[useTvAnalysisDisplay] Fetched existing analysis:', {
          hasFullAnalysis: !!data.full_analysis,
          hasContentSummary: !!data.analysis_content_summary,
          hasSummary: !!data.summary,
          finalAnalysisLength: analysisContent.length
        });

        return !!data.full_analysis;
      }
    } catch (error) {
      console.error('[useTvAnalysisDisplay] Error:', error);
    } finally {
      if (!options?.silent) setIsLoading(false);
    }
    return false;
  }, [transcriptionId, setExistingAnalysis]);

  useEffect(() => {
    fetchExistingAnalysis();
  }, [fetchExistingAnalysis, forceRefresh]);

  // Fallback polling for missed window events or late-mounted analysis UI.
  // Depend ONLY on transcriptionId so the interval isn't torn down/rebuilt
  // every time hasFullAnalysis flips — that re-creation was resetting
  // pollStartedAtRef and breaking the 10-minute hard timeout.
  useEffect(() => {
    console.log('[useTvAnalysisDisplay] Polling effect evaluated:', {
      transcriptionId,
      hasExistingAnalysis: !!existingAnalysis,
      existingAnalysisLength: existingAnalysis?.length || 0
    });

    if (!transcriptionId) return;
    if (hasFullAnalysisRef.current) return;

    if (pollStartedAtRef.current === null) {
      pollStartedAtRef.current = Date.now();
    }
    const interval = window.setInterval(async () => {
      if (hasFullAnalysisRef.current) {
        window.clearInterval(interval);
        return;
      }
      const elapsedMs = Date.now() - (pollStartedAtRef.current || Date.now());
      if (elapsedMs >= 10 * 60 * 1000) {
        window.clearInterval(interval);
        return;
      }

      const foundFullAnalysis = await fetchExistingAnalysis({ silent: true });
      if (foundFullAnalysis) window.clearInterval(interval);
    }, 8000);

    return () => window.clearInterval(interval);
  }, [transcriptionId, fetchExistingAnalysis]);

  // Listen for the cross-hook signal fired by useTranscriptionPolling when
  // the analyze-tv-stored background job finally writes full_analysis. The
  // initial fetch above runs before that completes, so without this listener
  // the UI is stuck on the placeholder until a full page reload.
  useEffect(() => {
    if (!transcriptionId) return;
    const handler = (event: Event) => {
      const detail = (event as CustomEvent).detail as
        | { transcriptionId?: string; full_analysis?: string }
        | undefined;
      if (!detail || detail.transcriptionId !== transcriptionId) return;

      console.log('[useTvAnalysisDisplay] tv-analysis-ready received for', transcriptionId);
      if (detail.full_analysis && detail.full_analysis.length > 0) {
        // Skip the round-trip: hydrate directly from the event payload.
        setExistingAnalysis(detail.full_analysis);
      } else {
        // Defensive: fall back to a re-fetch.
        fetchExistingAnalysis();
      }
    };

    window.addEventListener('tv-analysis-ready', handler as EventListener);
    return () => window.removeEventListener('tv-analysis-ready', handler as EventListener);
  }, [transcriptionId, fetchExistingAnalysis, setExistingAnalysis]);

  // Force reset internal state when transcriptionId becomes null
  useEffect(() => {
    if (!transcriptionId) {
      console.log('[useTvAnalysisDisplay] transcriptionId cleared, resetting internal state');
      removeExistingAnalysis();
      pollStartedAtRef.current = null;
    }
  }, [transcriptionId, removeExistingAnalysis]);

  return {
    existingAnalysis,
    hasAnalysis,
    isLoading,
    refetchAnalysis: fetchExistingAnalysis
  };
};
