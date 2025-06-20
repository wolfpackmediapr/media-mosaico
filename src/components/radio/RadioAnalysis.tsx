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
import { useSpeakerLabels } from "@/hooks/radio/useSpeakerLabels";
import { formatTranscriptionWithSpeakerNames } from "@/components/radio/utils/speakerLabelUtils";
import AnalysisActions from "./analysis/AnalysisActions";
import AnalysisResult from "./analysis/AnalysisResult";
import { usePersistentState } from "@/hooks/use-persistent-state";

interface RadioAnalysisProps {
  transcriptionText?: string;
  transcriptionId?: string;
  transcriptionResult?: TranscriptionResult;
  onSegmentsGenerated?: (segments: RadioNewsSegment[]) => void;
  onClearAnalysis?: (clearFn: () => void) => void;
  forceReset?: boolean;
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
  const { categories, isLoading: categoriesLoading } = useCategories();
  const { clients, isLoading: clientsLoading } = useClientData();
  const { getDisplayName, isLoading: speakerLabelsLoading } = useSpeakerLabels({ transcriptionId });
  const mountedRef = useRef(true);

  console.log('[RadioAnalysis] Component state:', {
    hasTranscriptionText: !!transcriptionText,
    transcriptionLength: transcriptionText?.length || 0,
    categoriesCount: categories.length,
    clientsCount: clients.length,
    categoriesLoading,
    clientsLoading,
    speakerLabelsLoading,
    isAnalyzing
  });

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
      
      try {
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

    if (categoriesLoading || clientsLoading) {
      toast.error("Cargando configuración, espere un momento...");
      return;
    }

    console.log('[RadioAnalysis] Starting analysis with:', {
      transcriptionLength: transcriptionText.length,
      categoriesCount: categories.length,
      clientsCount: clients.length,
      hasSpeakerLabels: !!getDisplayName && !speakerLabelsLoading
    });

    setIsAnalyzing(true);
    try {
      // Format transcription with custom speaker names if available
      let textForAnalysis = transcriptionText;
      
      if (transcriptionId && getDisplayName && !speakerLabelsLoading) {
        console.log('[RadioAnalysis] Formatting transcription with custom speaker names');
        textForAnalysis = formatTranscriptionWithSpeakerNames(
          transcriptionText,
          transcriptionResult,
          getDisplayName,
          speakerLabelsLoading
        );
        
        // Check if formatting was successful
        const hasCustomNames = textForAnalysis !== transcriptionText;
        console.log('[RadioAnalysis] Custom speaker names applied:', hasCustomNames);
        
        if (hasCustomNames) {
          console.log('[RadioAnalysis] Sample of formatted text:', textForAnalysis.substring(0, 300));
        }
      }

      // Format categories - ensure we have the category names, use name_es from database
      const formattedCategories = categories.length > 0 
        ? categories.map(cat => cat.name_es).filter(Boolean)
        : [
          'ENTRETENIMIENTO', 'EDUCACION & CULTURA', 'COMUNIDAD', 'SALUD', 
          'CRIMEN', 'TRIBUNALES', 'AMBIENTE & EL TIEMPO', 'ECONOMIA & NEGOCIOS',
          'GOBIERNO', 'POLITICA', 'EE.UU. & INTERNACIONALES', 'DEPORTES',
          'RELIGION', 'OTRAS', 'ACCIDENTES', 'CIENCIA & TECNOLOGIA'
        ];

      // Format clients with their keywords
      const formattedClients = clients.length > 0
        ? clients.map(client => ({
            name: client.name,
            keywords: Array.isArray(client.keywords) ? client.keywords : []
          }))
        : [];

      console.log('[RadioAnalysis] Calling edge function with:', {
        transcriptionTextLength: textForAnalysis.length,
        categoriesCount: formattedCategories.length,
        clientsCount: formattedClients.length,
        transcriptId: transcriptionId
      });

      const { data, error } = await supabase.functions.invoke('analyze-radio-content', {
        body: { 
          transcriptionText: textForAnalysis, // Use formatted text with custom speaker names
          transcriptId: transcriptionId || null,
          categories: formattedCategories,
          clients: formattedClients
        }
      });

      console.log('[RadioAnalysis] Edge function response:', { data, error });

      if (error) {
        console.error('[RadioAnalysis] Edge function error:', error);
        throw error;
      }

      if (data?.analysis) {
        console.log('[RadioAnalysis] Analysis received, length:', data.analysis.length);
        setAnalysis(data.analysis);
        
        // Provide more specific success message
        const hasCustomNames = textForAnalysis !== transcriptionText;
        const message = hasCustomNames 
          ? "El contenido ha sido analizado exitosamente con nombres personalizados." 
          : "El contenido ha sido analizado exitosamente.";
        
        toast.success(message);
        
        // Generate segments if callback provided
        if (onSegmentsGenerated) {
          console.log('[RadioAnalysis] Generating segments...');
          if (transcriptionResult) {
            generateRadioSegments(transcriptionResult);
          } else {
            generateRadioSegments(transcriptionText);
          }
        }
        
        // Create notification for successful analysis
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            let category = "";
            let keywords: string[] = [];
            let matchedClients: string[] = [];
            
            // Extract information from analysis
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
              console.log("[RadioAnalysis] Created notification for radio content analysis");
            }
          }
        } catch (notifyError) {
          console.error('[RadioAnalysis] Error creating notification:', notifyError);
        }
      } else {
        console.error('[RadioAnalysis] No analysis in response:', data);
        toast.error("No se recibió análisis del servidor");
      }
    } catch (error) {
      console.error('[RadioAnalysis] Error analyzing content:', error);
      toast.error(`No se pudo analizar el contenido: ${error.message || 'Error desconocido'}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generateImprovedSegments = () => {
    if ((!transcriptionText && !transcriptionResult) || !onSegmentsGenerated) {
      toast.error("No hay contenido para generar segmentos");
      return;
    }

    console.log('[RadioAnalysis] Generating improved segments...');
    if (transcriptionResult) {
      generateRadioSegments(transcriptionResult);
    } else if (transcriptionText) {
      generateRadioSegments(transcriptionText);
    }
    
    toast.success("Segmentos generados con timestamping mejorado");
  };

  // Show loading state if categories or clients are still loading
  const isDataLoading = categoriesLoading || clientsLoading;
  const hasTranscriptionText = !!transcriptionText && transcriptionText.length > 10;

  return (
    <Card>
      <CardHeader className="bg-gradient-to-r from-primary-50 to-transparent">
        <CardTitle className="text-xl font-bold">Análisis de Contenido</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        {(isDataLoading || speakerLabelsLoading) && (
          <div className="text-sm text-muted-foreground">
            Cargando configuración de categorías, clientes y etiquetas de hablantes...
          </div>
        )}
        <AnalysisActions
          isAnalyzing={isAnalyzing}
          hasTranscriptionText={hasTranscriptionText && !isDataLoading && !speakerLabelsLoading}
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
