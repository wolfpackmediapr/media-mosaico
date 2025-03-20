import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RadioNewsSegment } from "./RadioNewsSegmentsContainer";
import { createNotification } from "@/services/notifications/notificationService";

interface RadioAnalysisProps {
  transcriptionText?: string;
  onSegmentsGenerated?: (segments: RadioNewsSegment[]) => void;
}

const RadioAnalysis = ({ transcriptionText, onSegmentsGenerated }: RadioAnalysisProps) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState("");

  const analyzeContent = async () => {
    if (!transcriptionText) {
      toast.error("No hay texto para analizar");
      return;
    }

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-radio-content', {
        body: { transcriptionText }
      });

      if (error) throw error;

      if (data?.analysis) {
        setAnalysis(data.analysis);
        toast.success("El contenido ha sido analizado exitosamente.");
        
        // Generate radio segments based on analysis result
        if (onSegmentsGenerated) {
          generateImprovedSegments(data.analysis, transcriptionText);
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
        } catch (notificationError) {
          console.error("Error creating notification:", notificationError);
        }
      }
    } catch (error) {
      console.error('Error analyzing content:', error);
      toast.error("No se pudo analizar el contenido. Por favor, intenta nuevamente.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generateImprovedSegments = (analysisText: string, fullTranscription: string) => {
    if (!onSegmentsGenerated) return;
    
    // Extract keywords and topics from analysis
    const keywordsMatch = analysisText.match(/Keywords: (.*)/i);
    const keywordsString = keywordsMatch ? keywordsMatch[1] : "";
    const keywords = keywordsString.split(',').map(k => k.trim()).filter(k => k.length > 0);
    
    // Find natural segmentation points in the transcription
    // More sophisticated segmentation - look for topic changes or natural pauses
    const segments: RadioNewsSegment[] = [];
    
    // Split by clear topic markers like questions or new speakers
    const possibleSegments = fullTranscription
      .split(/(?:\?|\.|!)\s+(?=[A-Z¿¡])|(?:[\r\n]{2,})/g)
      .filter(text => text.trim().length > 50);
      
    // If we couldn't find natural segments, fall back to paragraph-based segmentation
    if (possibleSegments.length <= 1) {
      const paragraphs = fullTranscription
        .split(/\n\s*\n/)
        .filter(p => p.trim().length > 50);
        
      if (paragraphs.length > 1) {
        createSegmentsFromTexts(paragraphs, keywords, segments);
      } else {
        // If still no clear paragraphs, divide text into roughly equal segments
        const textLength = fullTranscription.length;
        const segmentCount = Math.max(2, Math.min(5, Math.floor(textLength / 300)));
        const segmentSize = Math.floor(textLength / segmentCount);
        
        for (let i = 0; i < segmentCount; i++) {
          const start = i * segmentSize;
          const end = (i === segmentCount - 1) ? textLength : (i + 1) * segmentSize;
          
          // Find a space to break at
          let breakPoint = end;
          while (breakPoint > start && fullTranscription[breakPoint] !== ' ' && breakPoint > start + 100) {
            breakPoint--;
          }
          
          const segmentText = fullTranscription.substring(start, breakPoint).trim();
          if (segmentText.length > 50) {
            const headline = extractHeadline(segmentText);
            segments.push({
              headline,
              text: segmentText,
              start: i * 60000,
              end: (i + 1) * 60000,
              keywords: assignKeywords(keywords, i, segmentCount)
            });
          }
        }
      }
    } else {
      createSegmentsFromTexts(possibleSegments, keywords, segments);
    }
    
    if (segments.length > 0) {
      console.log(`Generated ${segments.length} radio segments based on analysis`);
      onSegmentsGenerated(segments);
    } else {
      // Fallback if no segments could be created
      onSegmentsGenerated([{
        headline: "Contenido completo",
        text: fullTranscription,
        start: 0,
        end: 60000,
        keywords: keywords.slice(0, 5)
      }]);
    }
  };
  
  const createSegmentsFromTexts = (texts: string[], keywords: string[], segments: RadioNewsSegment[]) => {
    texts.forEach((text, index) => {
      if (text.trim().length > 50) {
        const headline = extractHeadline(text);
        segments.push({
          headline,
          text,
          start: index * 60000,
          end: (index + 1) * 60000,
          keywords: assignKeywords(keywords, index, texts.length)
        });
      }
    });
  };
  
  const extractHeadline = (text: string): string => {
    // Try to get first sentence or meaningful phrase
    const firstSentence = text.split(/[.!?]/, 1)[0];
    return firstSentence.length > 50 
      ? firstSentence.substring(0, 47) + '...'
      : firstSentence;
  };
  
  const assignKeywords = (allKeywords: string[], index: number, total: number): string[] => {
    if (allKeywords.length === 0) return [];
    
    // Distribute keywords among segments, ensuring each gets some
    const keywordsPerSegment = Math.max(2, Math.min(5, Math.ceil(allKeywords.length / total)));
    const startIdx = (index * keywordsPerSegment) % allKeywords.length;
    
    const segmentKeywords: string[] = [];
    for (let i = 0; i < keywordsPerSegment; i++) {
      const keywordIdx = (startIdx + i) % allKeywords.length;
      segmentKeywords.push(allKeywords[keywordIdx]);
    }
    
    return segmentKeywords;
  };

  return (
    <Card className="mt-6">
      <CardHeader className="bg-gradient-to-r from-primary-50 to-transparent">
        <CardTitle className="text-2xl font-bold text-primary-900">
          Análisis de Contenido Radial
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <div className="flex justify-end">
          <Button
            onClick={analyzeContent}
            disabled={isAnalyzing || !transcriptionText}
            className="w-full sm:w-auto"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analizando...
              </>
            ) : (
              'Analizar Contenido'
            )}
          </Button>
        </div>
        <Textarea
          value={analysis}
          readOnly
          className="min-h-[200px] font-mono text-sm"
          placeholder="El análisis del contenido radial aparecerá aquí..."
        />
      </CardContent>
    </Card>
  );
};

export default RadioAnalysis;
