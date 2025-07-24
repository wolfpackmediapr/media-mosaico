
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
        .select('analysis_content_summary, summary, analysis_keywords')
        .eq('id', transcriptionId)
        .single();

      if (error) {
        console.error('[useTvAnalysisDisplay] Error fetching analysis:', error);
        return;
      }

      if (data) {
        // Prioritize analysis_content_summary, then summary
        const analysisContent = data.analysis_content_summary || 
                               data.summary || 
                               "";
        
        setExistingAnalysis(analysisContent);
        setHasAnalysis(!!analysisContent);
        console.log('[useTvAnalysisDisplay] Fetched existing analysis:', {
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

  return {
    existingAnalysis,
    hasAnalysis,
    isLoading,
    refetchAnalysis: fetchExistingAnalysis
  };
};
