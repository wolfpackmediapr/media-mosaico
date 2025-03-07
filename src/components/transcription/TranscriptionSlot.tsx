
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileBarChart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import TranscriptionMetadata from "./TranscriptionMetadata";
import TranscriptionEditor from "./TranscriptionEditor";
import TranscriptionActions from "./TranscriptionActions";
import TranscriptionAnalysis from "./TranscriptionAnalysis";
import ChaptersSection from "../analysis/ChaptersSection";
import ContentSafetySection from "../analysis/ContentSafetySection";
import TopicsSection from "../analysis/TopicsSection";
import { TranscriptionAnalysis as TranscriptionAnalysisType } from "@/types/assemblyai";
import NewsSegmentGrid from "./NewsSegmentGrid";
import { NewsSegment } from "@/hooks/use-video-processor";

interface TranscriptionSlotProps {
  isProcessing: boolean;
  transcriptionText: string;
  newsSegments?: NewsSegment[];
  metadata?: {
    channel?: string;
    program?: string;
    category?: string;
    broadcastTime?: string;
    keywords?: string[];
  };
  analysis?: TranscriptionAnalysisType;
  onTranscriptionChange: (text: string) => void;
  onSegmentChange?: (index: number, text: string) => void;
}

const TranscriptionSlot = ({
  isProcessing,
  transcriptionText,
  newsSegments = [],
  metadata,
  analysis,
  onTranscriptionChange,
  onSegmentChange,
}: TranscriptionSlotProps) => {
  const handleGenerateReport = async () => {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);

      const { data, error } = await supabase.functions.invoke('generate-report', {
        body: {
          dateRange: {
            start: startDate.toISOString(),
            end: endDate.toISOString(),
          },
          type: 'transcription',
          format: 'pdf',
        },
      });

      if (error) throw error;
      toast.success('Report generated successfully');
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
    }
  };

  const handleChapterClick = (timestamp: number) => {
    console.log('Seeking to timestamp:', timestamp);
  };

  const handleSegmentTextUpdate = (index: number, updatedText: string) => {
    if (onSegmentChange) {
      onSegmentChange(index, updatedText);
    }
  };

  // Adding console logs to debug the news segments
  console.log("News Segments in TranscriptionSlot:", newsSegments);
  const useSegmentView = newsSegments && newsSegments.length > 0;
  console.log("Using segment view:", useSegmentView);

  return (
    <div className="space-y-6">
      <Card>
        <TranscriptionMetadata metadata={metadata} />
        <CardContent className="space-y-4">
          {useSegmentView ? (
            <NewsSegmentGrid 
              segments={newsSegments}
              isProcessing={isProcessing}
              onSegmentChange={handleSegmentTextUpdate}
            />
          ) : (
            <TranscriptionEditor
              transcriptionText={transcriptionText}
              isProcessing={isProcessing}
              onTranscriptionChange={onTranscriptionChange}
            />
          )}
          <div className="flex justify-between items-center">
            <TranscriptionActions
              transcriptionText={transcriptionText}
              metadata={metadata}
              isProcessing={isProcessing}
            />
            <Button
              variant="outline"
              onClick={handleGenerateReport}
              disabled={isProcessing || !transcriptionText}
            >
              <FileBarChart className="mr-2 h-4 w-4" />
              Generate Report
            </Button>
          </div>
        </CardContent>
      </Card>

      <TranscriptionAnalysis transcriptionText={transcriptionText} />

      {analysis && (
        <>
          <ChaptersSection 
            chapters={analysis.chapters}
            onChapterClick={handleChapterClick}
          />
          <ContentSafetySection contentSafety={analysis.content_safety_labels} />
          <TopicsSection topics={analysis.iab_categories_result} />
        </>
      )}
    </div>
  );
};

export default TranscriptionSlot;
