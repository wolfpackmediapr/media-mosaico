import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { usePersistentState } from "@/hooks/use-persistent-state";
import { useCategories } from "@/hooks/radio/useCategories";
import { useClientData } from "@/hooks/radio/useClientData";

interface UseTvAnalysisProps {
  transcriptionText?: string;
  transcriptionId?: string;
  onClearAnalysis?: (clearFn: () => void) => void;
  forceReset?: boolean;
}

const ANALYSIS_PERSIST_KEY = "tv-content-analysis";

export const useTvAnalysis = ({
  transcriptionText,
  transcriptionId,
  onClearAnalysis,
  forceReset
}: UseTvAnalysisProps) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis, removeAnalysis] = usePersistentState<string>(
    `${ANALYSIS_PERSIST_KEY}-${transcriptionId || "draft"}`,
    ""
  );
  
  const { categories } = useCategories();
  const { clients } = useClientData();
  const mountedRef = useRef(true);

  // Function to clear analysis state
  const clearAnalysisState = useRef(() => {
    console.log('[useTvAnalysis] Clearing analysis state');
    if (mountedRef.current) {
      setAnalysis("");
      removeAnalysis();
    }
  });

  // Register a clear handler via onClearAnalysis ref
  useEffect(() => {
    if (typeof onClearAnalysis === "function") {
      onClearAnalysis(clearAnalysisState.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClearAnalysis]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);
  
  // Handle force reset from parent
  useEffect(() => {
    if (forceReset) {
      console.log('[useTvAnalysis] Force reset triggered');
      clearAnalysisState.current();
      
      // Force delete any persistent storage keys related to analysis
      try {
        // Find and delete any session storage keys related to analysis
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key && (key.includes(ANALYSIS_PERSIST_KEY) || key.includes('tv-content-analysis'))) {
            console.log(`[useTvAnalysis] Removing session storage key: ${key}`);
            sessionStorage.removeItem(key);
          }
        }
      } catch (e) {
        console.error('[useTvAnalysis] Error cleaning session storage:', e);
      }
    }
  }, [forceReset]);

  // When transcriptionId changes or text is cleared, reset analysis
  useEffect(() => {
    if (!transcriptionText) {
      console.log('[useTvAnalysis] No transcription text, clearing analysis');
      setAnalysis("");
    }
  }, [transcriptionId, transcriptionText, setAnalysis]);

  const analyzeContent = async () => {
    if (!transcriptionText) {
      toast.error("No hay texto para analizar");
      return null;
    }

    setIsAnalyzing(true);
    try {
      const formattedCategories = categories.map(cat => cat.name_es);
      const formattedClients = clients.map(client => ({
        name: client.name,
        keywords: client.keywords || []
      }));

      const { data, error } = await supabase.functions.invoke('analyze-radio-content', {
        body: { 
          transcriptionText,
          transcriptId: transcriptionId || null,
          categories: formattedCategories,
          clients: formattedClients,
          contentType: 'tv'
        }
      });

      if (error) throw error;

      if (data?.analysis) {
        setAnalysis(data.analysis);
        toast.success("El contenido ha sido analizado exitosamente.");
        return data;
      }
      
      return null;
    } catch (error) {
      console.error('Error analyzing content:', error);
      toast.error("No se pudo analizar el contenido");
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  };

  return {
    isAnalyzing,
    analysis,
    analyzeContent,
    hasTranscriptionText: !!transcriptionText
  };
};