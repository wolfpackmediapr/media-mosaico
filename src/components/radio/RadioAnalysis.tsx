
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RadioNewsSegment } from "./RadioNewsSegmentsContainer";

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
          generateSegmentsFromAnalysis(data.analysis, transcriptionText);
        }
      }
    } catch (error) {
      console.error('Error analyzing content:', error);
      toast.error("No se pudo analizar el contenido. Por favor, intenta nuevamente.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generateSegmentsFromAnalysis = (analysisText: string, fullTranscription: string) => {
    if (!onSegmentsGenerated) return;
    
    // Extract keywords from analysis
    const keywordsMatch = analysisText.match(/Keywords: (.*)/i);
    const keywordsString = keywordsMatch ? keywordsMatch[1] : "";
    const keywords = keywordsString.split(',').map(k => k.trim()).filter(k => k.length > 0);
    
    // Simple segmentation by paragraphs
    const paragraphs = fullTranscription.split(/\n\s*\n/).filter(p => p.trim().length > 50);
    
    if (paragraphs.length === 0) {
      // If no clear paragraphs, create one segment with the full text
      const segment: RadioNewsSegment = {
        headline: "Análisis completo",
        text: fullTranscription,
        start: 0,
        end: 60000,
        keywords: keywords.slice(0, 5)
      };
      onSegmentsGenerated([segment]);
      return;
    }
    
    // Create segments from paragraphs
    const segments: RadioNewsSegment[] = paragraphs.map((paragraph, index) => {
      // Extract a headline from the first sentence
      const firstSentence = paragraph.split(/[.!?]/, 1)[0];
      const headline = firstSentence.length > 50 
        ? firstSentence.substring(0, 47) + '...'
        : firstSentence;
      
      // Assign some keywords to each segment
      const segmentKeywords = keywords.length > 0 
        ? keywords.slice(index % keywords.length, (index % keywords.length) + 3) 
        : [];
        
      return {
        headline: headline || `Segmento ${index + 1}`,
        text: paragraph,
        start: index * 60000, // Simple timestamps 60s apart
        end: (index + 1) * 60000,
        keywords: segmentKeywords
      };
    });
    
    onSegmentsGenerated(segments);
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
