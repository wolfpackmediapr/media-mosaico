
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

  // Force reset internal state when transcriptionId becomes null
  useEffect(() => {
    if (!transcriptionId) {
      console.log('[useTvAnalysisDisplay] transcriptionId cleared, resetting internal state');
      setExistingAnalysis("");
      setHasAnalysis(false);
    }
  }, [transcriptionId]);

  // Subscribe to realtime updates so analysis populated by analyze-tv-stored
  // (which runs in a separate edge function invocation after transcription)
  // is reflected immediately without a manual refresh.
  useEffect(() => {
    if (!transcriptionId) return;
    const channel = supabase
      .channel(`tv_analysis_${transcriptionId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tv_transcriptions', filter: `id=eq.${transcriptionId}` },
        (payload: any) => {
          const newRow = payload?.new || {};
          if (newRow.full_analysis || newRow.analysis_content_summary || newRow.summary) {
            console.log('[useTvAnalysisDisplay] Realtime analysis update detected, refetching');
            fetchExistingAnalysis();
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [transcriptionId]);

  return {
    existingAnalysis,
    hasAnalysis,
    isLoading,
    refetchAnalysis: fetchExistingAnalysis
  };
};
