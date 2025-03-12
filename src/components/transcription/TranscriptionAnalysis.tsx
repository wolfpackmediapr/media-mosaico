
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { NewsSegment } from "@/hooks/use-video-processor";

interface TranscriptionAnalysisProps {
  transcriptionText?: string;
  onSegmentsReceived?: (segments: NewsSegment[]) => void;
}

const TranscriptionAnalysis = ({ 
  transcriptionText,
  onSegmentsReceived
}: TranscriptionAnalysisProps) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState("");

  const analyzeContent = async () => {
    if (!transcriptionText) {
      toast.error("No hay texto para analizar");
      return;
    }

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-content', {
        body: { transcriptionText }
      });

      if (error) throw error;

      if (data?.analysis) {
        setAnalysis(data.analysis);
        toast.success("El contenido ha sido analizado exitosamente.");
        
        // Handle segments if they exist
        if (data.segments && Array.isArray(data.segments) && onSegmentsReceived) {
          // Convert to NewsSegment format
          const newsSegments = data.segments.map((segment: any) => ({
            headline: segment.segment_title,
            text: segment.transcript,
            start: convertTimestampToMs(segment.timestamp_start),
            end: convertTimestampToMs(segment.timestamp_end)
          }));
          
          onSegmentsReceived(newsSegments);
        }
      }
    } catch (error) {
      console.error('Error analyzing content:', error);
      toast.error("No se pudo analizar el contenido. Por favor, intenta nuevamente.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Helper function to convert timestamp format "00:00:00" to milliseconds
  const convertTimestampToMs = (timestamp: string): number => {
    if (!timestamp || typeof timestamp !== 'string') return 0;
    
    const parts = timestamp.split(':');
    if (parts.length !== 3) return 0;
    
    try {
      const hours = parseInt(parts[0]) || 0;
      const minutes = parseInt(parts[1]) || 0;
      const seconds = parseInt(parts[2]) || 0;
      
      return (hours * 3600 + minutes * 60 + seconds) * 1000;
    } catch (e) {
      console.error('Error converting timestamp:', e);
      return 0;
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader className="bg-gradient-to-r from-primary-50 to-transparent">
        <CardTitle className="text-2xl font-bold text-primary-900">
          Análisis de Contenido
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
          placeholder="El análisis del contenido aparecerá aquí..."
        />
      </CardContent>
    </Card>
  );
};

export default TranscriptionAnalysis;
