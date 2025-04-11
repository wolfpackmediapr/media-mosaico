import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileBarChart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEffect, useRef, useState } from "react";
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
    station_id?: string;
    program_id?: string;
  };
  onTranscriptionChange: (text: string) => void;
  onSegmentsReceived?: (segments: RadioNewsSegment[]) => void;
  onMetadataChange?: (metadata: {
    emisora: string;
    programa: string;
    horario: string;
    categoria: string;
    station_id: string;
    program_id: string;
  }) => void;
}

const RadioTranscriptionSlot = ({
  isProcessing,
  transcriptionText,
  transcriptionId,
  metadata,
  onTranscriptionChange,
  onSegmentsReceived,
  onMetadataChange
}: RadioTranscriptionSlotProps) => {
  const segmentsGeneratedRef = useRef(false);
  const transcriptionLength = useRef(0);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  const handleGenerateReport = async () => {
    try {
      setIsGeneratingReport(true);
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
    } finally {
      setIsGeneratingReport(false);
    }
  };

  useEffect(() => {
    const currentLength = transcriptionText?.length || 0;
    const lengthChanged = Math.abs(currentLength - transcriptionLength.current) > 100;
    
    if (transcriptionText && 
        currentLength > 100 && 
        onSegmentsReceived && 
        (!segmentsGeneratedRef.current || lengthChanged)) {
      
      console.log("Generating segments from transcription:", currentLength, 
                 "Previous length:", transcriptionLength.current,
                 "Already generated:", segmentsGeneratedRef.current);
      
      generateRadioSegments(transcriptionText);
      segmentsGeneratedRef.current = true;
      transcriptionLength.current = currentLength;
    }
  }, [transcriptionText, onSegmentsReceived]);

  const generateRadioSegments = (text: string) => {
    if (!text || text.length < 100 || !onSegmentsReceived) return;
    
    console.log("Starting segment generation process");
    
    const naturalSegments = text.split(/(?:\.\s+)(?=[A-Z])/g)
      .filter(seg => seg.trim().length > 100);
      
    if (naturalSegments.length >= 2) {
      console.log(`Found ${naturalSegments.length} natural segments`);
      createSegmentsFromChunks(naturalSegments);
      return;
    }
    
    const paragraphs = text.split(/\n\s*\n/)
      .filter(p => p.trim().length > 50);
      
    if (paragraphs.length >= 2) {
      console.log(`Found ${paragraphs.length} paragraph segments`);
      createSegmentsFromChunks(paragraphs);
      return;
    }
    
    const textLength = text.length;
    const targetSegmentCount = Math.max(2, Math.min(5, Math.floor(textLength / 400)));
    console.log(`Using time-based segmentation with ${targetSegmentCount} segments`);
    
    const segments: RadioNewsSegment[] = [];
    const segmentSize = Math.floor(textLength / targetSegmentCount);
    
    for (let i = 0; i < targetSegmentCount; i++) {
      const start = i * segmentSize;
      let end = (i === targetSegmentCount - 1) ? textLength : (i + 1) * segmentSize;
      
      const searchText = text.substring(start, Math.min(end + 100, textLength));
      const sentenceMatch = searchText.match(/[.!?]\s+/);
      
      if (sentenceMatch && sentenceMatch.index && sentenceMatch.index > 50) {
        end = start + sentenceMatch.index + sentenceMatch[0].length;
      }
      
      const segmentText = text.substring(start, end).trim();
      if (segmentText.length > 0) {
        const headline = extractHeadline(segmentText);
        
        segments.push({
          headline: headline || `Segmento ${i + 1}`,
          text: segmentText,
          start: i * 60000,
          end: (i + 1) * 60000,
          keywords: extractKeywords(segmentText)
        });
      }
    }
    
    if (segments.length > 0) {
      onSegmentsReceived(segments);
    }
  };
  
  const createSegmentsFromChunks = (chunks: string[]) => {
    if (!onSegmentsReceived) return;
    
    const segments: RadioNewsSegment[] = chunks.map((chunk, index) => {
      const headline = extractHeadline(chunk);
      return {
        headline: headline || `Segmento ${index + 1}`,
        text: chunk,
        start: index * 60000,
        end: (index + 1) * 60000,
        keywords: extractKeywords(chunk)
      };
    });
    
    onSegmentsReceived(segments);
  };
  
  const extractHeadline = (text: string): string => {
    const firstSentence = text.split(/[.!?]/, 1)[0];
    return firstSentence.length > 50 
      ? firstSentence.substring(0, 47) + '...'
      : firstSentence;
  };
  
  const extractKeywords = (text: string): string[] => {
    const words = text.toLowerCase()
      .replace(/[^\wáéíóúüñ\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3);
      
    const wordFrequency: Record<string, number> = {};
    const stopWords = ['para', 'como', 'pero', 'cuando', 'donde', 'porque', 'entonces', 'también', 'esto', 'esta', 'estos', 'estas'];
    
    words.forEach(word => {
      if (!stopWords.includes(word)) {
        wordFrequency[word] = (wordFrequency[word] || 0) + 1;
      }
    });
    
    return Object.entries(wordFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);
  };

  return (
    <div className="space-y-4 md:space-y-6 h-full w-full">
      <Card className="overflow-hidden w-full">
        <RadioTranscriptionMetadata metadata={metadata} onMetadataChange={onMetadataChange} />
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
              disabled={isProcessing || !transcriptionText || isGeneratingReport}
              className="w-full sm:w-auto"
            >
              <FileBarChart className="mr-2 h-4 w-4" />
              {isGeneratingReport ? 'Generando...' : 'Generar Reporte'}
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
