
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileBarChart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEffect, useRef } from "react";
import RadioTranscriptionMetadata from "./RadioTranscriptionMetadata";
import RadioTranscriptionEditor from "./RadioTranscriptionEditor";
import RadioAnalysis from "./RadioAnalysis";
import { RadioNewsSegment } from "./RadioNewsSegmentsContainer";

interface RadioTranscriptionSlotProps {
  isProcessing: boolean;
  transcriptionText: string;
  transcriptionId?: string;
  metadata?: {
    emisora?: string;
    programa?: string;
    horario?: string;
    categoria?: string;
  };
  onTranscriptionChange: (text: string) => void;
  onSegmentsReceived?: (segments: RadioNewsSegment[]) => void;
}

const RadioTranscriptionSlot = ({
  isProcessing,
  transcriptionText,
  transcriptionId,
  metadata,
  onTranscriptionChange,
  onSegmentsReceived,
}: RadioTranscriptionSlotProps) => {
  // Use a ref to track if we've already generated segments to prevent infinite loops
  const segmentsGeneratedRef = useRef(false);

  const handleGenerateReport = async () => {
    try {
      toast.loading('Generando reporte...');
      
      const { data, error } = await supabase.functions.invoke('generate-radio-report', {
        body: {
          transcriptionText,
          metadata,
          type: 'radio',
          format: 'pdf',
        },
      });

      if (error) throw error;
      
      toast.dismiss();
      toast.success('Reporte generado exitosamente');
    } catch (error) {
      console.error('Error generating report:', error);
      toast.dismiss();
      toast.error('Error al generar el reporte');
    }
  };

  // Use useEffect to generate segments when transcription text changes
  useEffect(() => {
    // Only generate segments if we have text and haven't already done so
    if (transcriptionText && 
        transcriptionText.length > 100 && 
        onSegmentsReceived && 
        !segmentsGeneratedRef.current) {
      generateRadioSegments(transcriptionText);
      segmentsGeneratedRef.current = true;
    }
  }, [transcriptionText, onSegmentsReceived]);

  const generateRadioSegments = (text: string) => {
    if (!text || text.length < 100 || !onSegmentsReceived) return;
    
    // Simple segmentation logic - split by paragraphs and create segments
    const paragraphs = text.split(/\n\s*\n/);
    const segments: RadioNewsSegment[] = paragraphs
      .filter(p => p.trim().length > 50)
      .map((paragraph, index) => {
        // Determine a headline from the first sentence or first 50 chars
        const firstSentence = paragraph.split(/[.!?]/, 1)[0];
        const headline = firstSentence.length > 50 
          ? firstSentence.substring(0, 47) + '...'
          : firstSentence;
          
        // Extract potential keywords
        const words = paragraph.toLowerCase()
          .replace(/[^\w\s]/g, '')
          .split(/\s+/)
          .filter(word => word.length > 3);
          
        const wordFrequency: Record<string, number> = {};
        words.forEach(word => {
          wordFrequency[word] = (wordFrequency[word] || 0) + 1;
        });
        
        const keywords = Object.entries(wordFrequency)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([word]) => word);
          
        return {
          headline: headline || `Segmento ${index + 1}`,
          text: paragraph,
          start: index * 60000, // Simulate different timestamps (60s apart)
          end: (index + 1) * 60000,
          keywords
        };
      });
      
    if (segments.length > 0) {
      onSegmentsReceived(segments);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 h-full w-full">
      <Card className="overflow-hidden w-full">
        <RadioTranscriptionMetadata metadata={metadata} />
        <CardContent className="p-4 space-y-4">
          <RadioTranscriptionEditor
            transcriptionText={transcriptionText}
            isProcessing={isProcessing}
            onTranscriptionChange={onTranscriptionChange}
            transcriptionId={transcriptionId}
          />
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={handleGenerateReport}
              disabled={isProcessing || !transcriptionText}
              className="w-full sm:w-auto"
            >
              <FileBarChart className="mr-2 h-4 w-4" />
              Generar Reporte
            </Button>
          </div>
        </CardContent>
      </Card>

      <RadioAnalysis 
        transcriptionText={transcriptionText} 
        onSegmentsGenerated={onSegmentsReceived}
      />
    </div>
  );
};

export default RadioTranscriptionSlot;
