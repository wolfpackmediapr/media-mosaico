
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { usePersistentState } from "@/hooks/use-persistent-state";
import { useCategories } from "@/hooks/radio/useCategories";
import { useClientData } from "@/hooks/radio/useClientData";

interface UseTvAnalysisProps {
  transcriptionText?: string;
  transcriptionId?: string;
  videoPath?: string;
  onClearAnalysis?: (clearFn: () => void) => void;
  forceReset?: boolean;
}

const ANALYSIS_PERSIST_KEY = "tv-content-analysis";

export const useTvAnalysis = ({
  transcriptionText,
  transcriptionId,
  videoPath,
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
      
      try {
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
    // Basic validation
    if (!transcriptionText && !videoPath) {
      toast.error("No hay contenido para analizar");
      return null;
    }

    console.log('[useTvAnalysis] Starting TV content analysis');
    setIsAnalyzing(true);
    
    try {
      // Check authentication first
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.error('[useTvAnalysis] Authentication error:', authError);
        throw new Error('Debe iniciar sesión para analizar contenido');
      }

      // Use the unified Gemini processing function
      const { data, error } = await supabase.functions.invoke('process-tv-with-gemini', {
        body: { 
          videoPath: videoPath,
          transcriptionId: transcriptionId,
          transcriptionText: transcriptionText
        }
      });

      if (error) {
        console.error('[useTvAnalysis] Processing error:', error);
        throw new Error(`Error al procesar: ${error.message}`);
      }

      if (data?.success) {
        console.log('[useTvAnalysis] Analysis completed successfully');
        
        // Create a comprehensive analysis summary
        const analysisText = JSON.stringify({
          summary: data.summary || 'Análisis completado',
          keywords: data.keywords || [],
          analysis: data.analysis || {},
          segments_count: data.segments?.length || 0
        }, null, 2);
        
        setAnalysis(analysisText);
        toast.success("Análisis de contenido completado");
        return data;
      }
      
      console.warn('[useTvAnalysis] No analysis received');
      throw new Error('No se recibió análisis del servidor');
      
    } catch (error: any) {
      console.error('[useTvAnalysis] Error analyzing TV content:', error);
      
      // Show user-friendly error message
      const userMessage = error.message || 'Error desconocido al analizar el contenido';
      toast.error(`Error: ${userMessage}`);
      
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  };

  return {
    isAnalyzing,
    analysis,
    analyzeContent,
    hasContent: !!(transcriptionText || videoPath),
    canAnalyze: !!(transcriptionText || videoPath)
  };
};
