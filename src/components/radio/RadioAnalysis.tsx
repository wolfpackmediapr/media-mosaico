
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RadioNewsSegment } from "./RadioNewsSegmentsContainer";
import { createNotification } from "@/services/notifications/unifiedNotificationService";
import { TranscriptionResult } from "@/services/audio/transcriptionService";
import { useRadioSegmentGenerator } from "@/hooks/radio/useRadioSegmentGenerator";
import AnalysisActions from "./analysis/AnalysisActions";
import AnalysisResult from "./analysis/AnalysisResult";

interface RadioAnalysisProps {
  transcriptionText?: string;
  transcriptionId?: string;
  transcriptionResult?: TranscriptionResult;
  onSegmentsGenerated?: (segments: RadioNewsSegment[]) => void;
}

const RadioAnalysis = ({ transcriptionText, transcriptionId, transcriptionResult, onSegmentsGenerated }: RadioAnalysisProps) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState("");
  const { generateRadioSegments } = useRadioSegmentGenerator(onSegmentsGenerated);

  const analyzeContent = async () => {
    if (!transcriptionText) {
      toast.error("No hay texto para analizar");
      return;
    }

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-radio-content', {
        body: { 
          transcriptionText,
          transcriptId: transcriptionId || null
        }
      });

      if (error) throw error;

      if (data?.analysis) {
        setAnalysis(data.analysis);
        toast.success("El contenido ha sido analizado exitosamente.");
        
        // Generate radio segments based on analysis result
        if (onSegmentsGenerated) {
          if (transcriptionResult) {
            // Pass full result object for timestamp-aware segmentation
            generateRadioSegments(transcriptionResult);
          } else {
            // Fallback to text-only segmentation
            generateRadioSegments(transcriptionText);
          }
        }
        
        // Create notification for radio content analysis
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            // Extract category and keywords from analysis text if available
            let category = "";
            let keywords: string[] = [];
            let matchedClients: string[] = [];
            
            // Try to parse category, keywords and clients from the analysis text
            const categoryMatch = data.analysis.match(/Categoría:?\s*([A-Z\s&]+)/i);
            if (categoryMatch && categoryMatch[1]) {
              category = categoryMatch[1].trim();
            }
            
            const keywordsMatch = data.analysis.match(/Keywords:?\s*([^\.]+)/i);
            if (keywordsMatch && keywordsMatch[1]) {
              keywords = keywordsMatch[1].split(',').map((k: string) => k.trim()).filter(Boolean);
            }
            
            const clientsMatch = data.analysis.match(/Clientes relacionados:?\s*([^\.]+)/i);
            if (clientsMatch && clientsMatch[1]) {
              matchedClients = clientsMatch[1].split(',').map((c: string) => c.trim()).filter(Boolean);
            }
            
            // Only create notification if we found some useful info
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
      // Use the full result object for timestamp-aware segmentation
      generateRadioSegments(transcriptionResult);
    } else if (transcriptionText) {
      // Fallback to text-only segmentation
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
