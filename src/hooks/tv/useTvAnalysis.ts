
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

type AnalysisType = 'text' | 'video' | 'hybrid' | 'gemini';

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
  const [analysisType, setAnalysisType] = useState<AnalysisType>('gemini');
  
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

  // Determine optimal analysis type based on available data
  const getOptimalAnalysisType = (): AnalysisType => {
    // Always prefer Gemini for new analyses since it handles both video and text
    return 'gemini';
  };

  const analyzeContent = async (requestedType?: AnalysisType) => {
    const effectiveAnalysisType = requestedType || getOptimalAnalysisType();
    
    // For Gemini analysis, we need either transcription text or video path
    if (effectiveAnalysisType === 'gemini' && (!transcriptionText && !videoPath)) {
      toast.error("No hay contenido para analizar");
      return null;
    }
    
    // For legacy analysis types
    if (effectiveAnalysisType === 'text' && !transcriptionText) {
      toast.error("No hay texto para analizar");
      return null;
    }
    
    if ((effectiveAnalysisType === 'video' || effectiveAnalysisType === 'hybrid') && !videoPath) {
      toast.error("No hay video disponible para análisis visual");
      return null;
    }

    console.log('[useTvAnalysis] Starting TV analysis with type:', effectiveAnalysisType);
    setIsAnalyzing(true);
    setAnalysisType(effectiveAnalysisType);
    
    try {
      const formattedCategories = categories.map(cat => cat.name_es);
      const formattedClients = clients.map(client => ({
        name: client.name,
        keywords: client.keywords || []
      }));

      let functionName = 'analyze-tv-content';
      let requestBody: any = {};

      if (effectiveAnalysisType === 'gemini') {
        // Use the unified Gemini function if we haven't processed yet
        // Otherwise, use the existing analysis function for additional insights
        console.log('[useTvAnalysis] Using Gemini-enhanced analysis');
        
        requestBody = { 
          transcriptionText,
          transcriptId: transcriptionId || null,
          videoPath: videoPath,
          analysisType: 'hybrid', // Use hybrid for enhanced analysis
          categories: formattedCategories,
          clients: formattedClients,
          enhancedMode: true // Flag for Gemini-enhanced analysis
        };
      } else {
        // Legacy analysis types
        requestBody = { 
          transcriptionText: effectiveAnalysisType !== 'video' ? transcriptionText : undefined,
          transcriptId: transcriptionId || null,
          videoPath: (effectiveAnalysisType === 'video' || effectiveAnalysisType === 'hybrid') ? videoPath : undefined,
          analysisType: effectiveAnalysisType,
          categories: formattedCategories,
          clients: formattedClients
        };
      }

      console.log('[useTvAnalysis] Calling', functionName, 'edge function');

      const { data, error } = await supabase.functions.invoke(functionName, {
        body: requestBody
      });

      if (error) {
        console.error('[useTvAnalysis] Edge function error:', error);
        
        // Provide more specific error messages based on the error
        let errorMessage = 'No se pudo analizar el contenido de TV';
        
        if (error.message) {
          if (error.message.includes('Google Gemini API key not configured')) {
            errorMessage = 'API de Gemini no configurada. Contacte al administrador.';
          } else if (error.message.includes('Edge Function returned a non-2xx status code')) {
            errorMessage = 'Error en el servicio de análisis. Intente nuevamente en unos momentos.';
          } else {
            errorMessage = `Error de análisis: ${error.message}`;
          }
        }
        
        throw new Error(errorMessage);
      }

      if (data?.analysis) {
        console.log('[useTvAnalysis] TV analysis completed successfully with type:', effectiveAnalysisType);
        
        // Format analysis for display
        const analysisText = typeof data.analysis === 'object' 
          ? JSON.stringify(data.analysis, null, 2)
          : data.analysis;
        
        setAnalysis(analysisText);
        
        // Show appropriate success message based on analysis type
        const typeMessages = {
          text: "El contenido de TV ha sido analizado exitosamente (análisis de texto).",
          video: "El contenido de TV ha sido analizado exitosamente (análisis visual completo).",
          hybrid: "El contenido de TV ha sido analizado exitosamente (análisis híbrido: texto + video).",
          gemini: "El contenido de TV ha sido analizado exitosamente con Gemini AI (análisis multimodal completo)."
        };
        
        toast.success(typeMessages[effectiveAnalysisType]);
        return data;
      }
      
      console.warn('[useTvAnalysis] No analysis received');
      return null;
    } catch (error) {
      console.error('[useTvAnalysis] Error analyzing TV content:', error);
      toast.error(`${error.message || 'Error desconocido al analizar el contenido'}`);
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  };

  return {
    isAnalyzing,
    analysis,
    analysisType,
    analyzeContent,
    hasTranscriptionText: !!transcriptionText,
    hasVideoPath: !!videoPath,
    canDoHybridAnalysis: !!(transcriptionText && videoPath),
    canDoVideoAnalysis: !!videoPath,
    canDoGeminiAnalysis: !!(transcriptionText || videoPath),
    optimalAnalysisType: getOptimalAnalysisType()
  };
};
