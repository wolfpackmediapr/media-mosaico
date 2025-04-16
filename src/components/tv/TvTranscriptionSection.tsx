
import TranscriptionSlot from "@/components/transcription/TranscriptionSlot";
import NewsSegmentsContainer from "@/components/transcription/NewsSegmentsContainer";
import { NewsSegment } from "@/hooks/use-video-processor";

interface TvTranscriptionSectionProps {
  textContent: string;
  newsSegments: NewsSegment[];
  isProcessing: boolean;
  transcriptionMetadata?: {
    channel?: string;
    program?: string;
    category?: string;
    broadcastTime?: string;
  };
  testAnalysis: any;
  onTranscriptionChange: (text: string) => void;
  onSegmentsChange: (segments: NewsSegment[]) => void;
  onSeekToTimestamp: (timestamp: number) => void;
  onSegmentsReceived: (segments: NewsSegment[]) => void;
}

const TvTranscriptionSection = ({
  textContent,
  newsSegments,
  isProcessing,
  transcriptionMetadata,
  testAnalysis,
  onTranscriptionChange,
  onSegmentsChange,
  onSeekToTimestamp,
  onSegmentsReceived
}: TvTranscriptionSectionProps) => {
  
  if (!textContent) return null;

  return (
    <>
      <NewsSegmentsContainer
        segments={newsSegments}
        onSegmentsChange={onSegmentsChange}
        onSeek={onSeekToTimestamp}
        isProcessing={isProcessing}
      />

      <TranscriptionSlot
        isProcessing={isProcessing}
        transcriptionText={textContent}
        metadata={transcriptionMetadata || {
          channel: "WIPR",
          program: "Noticias Puerto Rico",
          category: "Economía",
          broadcastTime: "2024-03-15T10:00:00Z"
        }}
        analysis={testAnalysis}
        onTranscriptionChange={onTranscriptionChange}
        onSegmentsReceived={onSegmentsReceived}
      />
    </>
  );
};

export default TvTranscriptionSection;
