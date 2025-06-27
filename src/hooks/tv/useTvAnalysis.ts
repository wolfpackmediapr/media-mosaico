
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
    return 'gemini';
  };

  const analyzeContent = async (requestedType?: AnalysisType) => {
    const effectiveAnalysisType = requestedType || getOptimalAnalysisType();
    
    // Basic validation
    if (!transcriptionText && !videoPath) {
      toast.error("No hay contenido para analizar");
      return null;
    }

    console.log('[useTvAnalysis] Starting TV analysis with type:', effectiveAnalysisType);
    setIsAnalyzing(true);
    setAnalysisType(effectiveAnalysisType);
    
    try {
      // Check authentication first
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.error('[useTvAnalysis] Authentication error:', authError);
        throw new Error('Debe iniciar sesión para analizar contenido');
      }

      const formattedCategories = categories.map(cat => cat.name_es);
      const formattedClients = clients.map(client => ({
        name: client.name,
        keywords: client.keywords || []
      }));

      const requestBody = { 
        transcriptionText,
        transcriptId: transcriptionId || null,
        videoPath: videoPath,
        analysisType: effectiveAnalysisType,
        categories: formattedCategories,
        clients: formattedClients,
        enhancedMode: true
      };

      console.log('[useTvAnalysis] Calling analyze-tv-content edge function with body:', {
        hasTranscriptionText: !!transcriptionText,
        hasVideoPath: !!videoPath,
        analysisType: effectiveAnalysisType
      });

      const { data, error } = await supabase.functions.invoke('analyze-tv-content', {
        body: requestBody
      });

      if (error) {
        console.error('[useTvAnalysis] Edge function error:', error);
        
        // Provide specific error messages
        let errorMessage = 'No se pudo analizar el contenido de TV';
        
        if (error.message) {
          if (error.message.includes('Google Gemini API key not configured') || 
              error.message.includes('Clave API de Google Gemini no configurada')) {
            errorMessage = 'API de Gemini no configurada. Contacte al administrador.';
          } else if (error.message.includes('authentication') || 
                     error.message.includes('auth') || 
                     error.message.includes('Token de autorización')) {
            errorMessage = 'Error de autenticación. Por favor, inicie sesión nuevamente.';
          } else if (error.message.includes('video') && transcriptionText) {
            errorMessage = 'Error con el video. Intentando análisis solo con texto...';
            // Retry with text-only analysis
            return analyzeContent('text');
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
        
        // Show success message
        const typeMessages = {
          text: "Análisis de contenido completado (texto).",
          video: "Análisis de contenido completado (video).",
          hybrid: "Análisis de contenido completado (híbrido).",
          gemini: "Análisis de contenido completado con Gemini AI."
        };
        
        toast.success(typeMessages[effectiveAnalysisType]);
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
