
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
import { NewsSegment } from "@/hooks/use-video-processor";
import NewsSegmentsContainer from "./NewsSegmentsContainer";

interface TranscriptionSlotProps {
  isProcessing: boolean;
  transcriptionText: string;
  newsSegments: NewsSegment[];
  onNewsSegmentsChange: (segments: NewsSegment[]) => void;
  metadata?: {
    channel?: string;
    program?: string;
    category?: string;
    broadcastTime?: string;
    keywords?: string[];
  };
  analysis?: TranscriptionAnalysisType;
  onTranscriptionChange: (text: string) => void;
  onSeekVideo?: (timestamp: number) => void;
}

const TranscriptionSlot = ({
  isProcessing,
  transcriptionText,
  newsSegments,
  onNewsSegmentsChange,
  metadata,
  analysis,
  onTranscriptionChange,
  onSeekVideo,
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
    if (onSeekVideo) {
      onSeekVideo(timestamp);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <TranscriptionMetadata metadata={metadata} />
        <CardContent className="space-y-4">
          <TranscriptionEditor
            transcriptionText={transcriptionText}
            isProcessing={isProcessing}
            onTranscriptionChange={onTranscriptionChange}
          />
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

      {/* Display News Segments Container inside TranscriptionSlot for better organization */}
      <NewsSegmentsContainer
        segments={newsSegments}
        onSegmentsChange={onNewsSegmentsChange}
        onSeek={onSeekVideo}
        isProcessing={isProcessing}
      />

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
