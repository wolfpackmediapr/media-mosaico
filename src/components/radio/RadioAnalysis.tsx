import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RadioNewsSegment } from "./RadioNewsSegmentsContainer";
import { createNotification } from "@/services/notifications/unifiedNotificationService";
import { TranscriptionResult } from "@/services/audio/transcriptionService";
import { useRadioSegmentGenerator } from "@/hooks/radio/useRadioSegmentGenerator";
import { useCategories } from "@/hooks/radio/useCategories";
import { useClientData } from "@/hooks/radio/useClientData";
import AnalysisActions from "./analysis/AnalysisActions";
import AnalysisResult from "./analysis/AnalysisResult";
import { usePersistentState } from "@/hooks/use-persistent-state";

interface RadioAnalysisProps {
  transcriptionText?: string;
  transcriptionId?: string;
  transcriptionResult?: TranscriptionResult;
  onSegmentsGenerated?: (segments: RadioNewsSegment[]) => void;
  onClearAnalysis?: (clearFn: () => void) => void;
  forceReset?: boolean; // Add forceReset prop
}

const ANALYSIS_PERSIST_KEY = "radio-content-analysis";

const RadioAnalysis = ({
  transcriptionText,
  transcriptionId,
  transcriptionResult,
  onSegmentsGenerated,
  onClearAnalysis,
  forceReset
}: RadioAnalysisProps) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis, removeAnalysis] = usePersistentState<string>(
    `${ANALYSIS_PERSIST_KEY}-${transcriptionId || "draft"}`,
    ""
  );
  
  const { generateRadioSegments } = useRadioSegmentGenerator(onSegmentsGenerated);
  const { categories } = useCategories();
  const { clients } = useClientData();
  const mountedRef = useRef(true);

  // Function to clear analysis state
  const clearAnalysisState = useRef(() => {
    console.log('[RadioAnalysis] Clearing analysis state');
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
      console.log('[RadioAnalysis] Force reset triggered');
      clearAnalysisState.current();
      
      // Force delete any persistent storage keys related to analysis
      try {
        // Find and delete any session storage keys related to analysis
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key && (key.includes(ANALYSIS_PERSIST_KEY) || key.includes('radio-content-analysis'))) {
            console.log(`[RadioAnalysis] Removing session storage key: ${key}`);
            sessionStorage.removeItem(key);
          }
        }
      } catch (e) {
        console.error('[RadioAnalysis] Error cleaning session storage:', e);
      }
    }
  }, [forceReset]);

  // When transcriptionId changes or text is cleared, reset analysis
  useEffect(() => {
    if (!transcriptionText) {
      console.log('[RadioAnalysis] No transcription text, clearing analysis');
      setAnalysis("");
    }
  }, [transcriptionId, transcriptionText, setAnalysis]);

  const analyzeContent = async () => {
    if (!transcriptionText) {
      toast.error("No hay texto para analizar");
      return;
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
          clients: formattedClients
        }
      });

      if (error) throw error;

      if (data?.analysis) {
        setAnalysis(data.analysis);
        toast.success("El contenido ha sido analizado exitosamente.");
        
        if (onSegmentsGenerated) {
          if (transcriptionResult) {
            generateRadioSegments(transcriptionResult);
          } else {
            generateRadioSegments(transcriptionText);
          }
        }
        
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            let category = "";
            let keywords: string[] = [];
            let matchedClients: string[] = [];
            
            const categoryMatch = data.analysis.match(/Categoría[s]?:?\s*([A-ZÁ-ÚÑ\s&]+)/i);
            if (categoryMatch && categoryMatch[1]) {
              category = categoryMatch[1].trim();
            }
            
            const keywordsMatch = data.analysis.match(/Palabras clave:?\s*([^\.]+)/i);
            if (keywordsMatch && keywordsMatch[1]) {
              keywords = keywordsMatch[1].split(',').map((k: string) => k.trim()).filter(Boolean);
            }
            
            const clientsMatch = data.analysis.match(/Clientes [^:]*:?\s*([^\.]+)/i);
            if (clientsMatch && clientsMatch[1]) {
              matchedClients = clientsMatch[1].split(',').map((c: string) => c.trim()).filter(Boolean);
            }
            
            if (category || keywords.length > 0 || matchedClients.length > 0) {
              await createNotification({
                client_id: user.id,
                title: `Análisis de contenido radial: ${category || 'Sin categoría'}`,
                description: `${matchedClients.length > 0 ? 'Clientes: ' + matchedClients.join(', ') : ''}`,
                content_type: "radio",
                importance_level: matchedClients.length > 0 ? 4 : 3,
                keyword_matched: keywords,
                metadata: {
                  category,
                  matchedClients,
                  relevantKeywords: keywords
                }
              });
              console.log("Created notification for radio content analysis");
            }
          }
        } catch (notifyError) {
          console.error('Error creating notification:', notifyError);
        }
      }
    } catch (error) {
      console.error('Error analyzing content:', error);
      toast.error("No se pudo analizar el contenido");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generateImprovedSegments = () => {
    if ((!transcriptionText && !transcriptionResult) || !onSegmentsGenerated) {
      toast.error("No hay contenido para generar segmentos");
      return;
    }

    if (transcriptionResult) {
      generateRadioSegments(transcriptionResult);
    } else if (transcriptionText) {
      generateRadioSegments(transcriptionText);
    }
    
    toast.success("Segmentos generados con timestamping mejorado");
  };

  return (
    <Card>
      <CardHeader className="bg-gradient-to-r from-primary-50 to-transparent">
        <CardTitle className="text-xl font-bold">Análisis de Contenido</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        <AnalysisActions
          isAnalyzing={isAnalyzing}
          hasTranscriptionText={!!transcriptionText}
          onAnalyzeContent={analyzeContent}
          showSegmentGeneration={true}
          canGenerateSegments={!!(transcriptionText || transcriptionResult)}
          onGenerateSegments={generateImprovedSegments}
        />
        <AnalysisResult analysis={analysis} />
      </CardContent>
    </Card>
  );
};

export default RadioAnalysis;
