
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UseTvAnalysisDisplayProps {
  transcriptionId?: string;
  forceRefresh?: boolean;
}

export const useTvAnalysisDisplay = ({
  transcriptionId,
  forceRefresh
}: UseTvAnalysisDisplayProps) => {
  const [existingAnalysis, setExistingAnalysis] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasAnalysis, setHasAnalysis] = useState(false);

  const fetchExistingAnalysis = async () => {
    if (!transcriptionId) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('tv_transcriptions')
        .select('full_analysis, analysis_content_summary, summary, analysis_keywords')
        .eq('id', transcriptionId)
        .single();

      if (error) {
        console.error('[useTvAnalysisDisplay] Error fetching analysis:', error);
        return;
      }

      if (data) {
        // Prioritize full_analysis (has complete structured data), then analysis_content_summary, then summary
        const analysisContent = data.full_analysis || 
                               data.analysis_content_summary || 
                               data.summary || 
                               "";
        
        setExistingAnalysis(analysisContent);
        setHasAnalysis(!!analysisContent);
        console.log('[useTvAnalysisDisplay] Fetched existing analysis:', {
          hasFullAnalysis: !!data.full_analysis,
          hasContentSummary: !!data.analysis_content_summary,
          hasSummary: !!data.summary,
          finalAnalysisLength: analysisContent.length
        });
      }
    } catch (error) {
      console.error('[useTvAnalysisDisplay] Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExistingAnalysis();
  }, [transcriptionId, forceRefresh]);

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
        setHasAnalysis(true);
      } else {
        // Defensive: fall back to a re-fetch.
        fetchExistingAnalysis();
      }
    };

    window.addEventListener('tv-analysis-ready', handler as EventListener);
    return () => window.removeEventListener('tv-analysis-ready', handler as EventListener);
  }, [transcriptionId]);

  // Force reset internal state when transcriptionId becomes null
  useEffect(() => {
    if (!transcriptionId) {
      console.log('[useTvAnalysisDisplay] transcriptionId cleared, resetting internal state');
      setExistingAnalysis("");
      setHasAnalysis(false);
    }
  }, [transcriptionId]);

  return {
    existingAnalysis,
    hasAnalysis,
    isLoading,
    refetchAnalysis: fetchExistingAnalysis
  };
};
