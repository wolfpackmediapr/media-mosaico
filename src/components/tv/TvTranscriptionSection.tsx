
import TvTranscriptionSlot from "./TvTranscriptionSlot";
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
  // New props for video player integration
  currentTime?: number;
  isPlaying?: boolean;
  onPlayPause?: () => void;
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
  onSegmentsReceived,
  currentTime = 0,
  isPlaying = false,
  onPlayPause = () => {}
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

      <TvTranscriptionSlot
        isProcessing={isProcessing}
        transcriptionText={textContent}
        metadata={transcriptionMetadata || {
          channel: "WIPR",
          program: "Noticias Puerto Rico",
          category: "Economía",
          broadcastTime: "2024-03-15T10:00:00Z"
        }}
        onTranscriptionChange={onTranscriptionChange}
        onSegmentsReceived={onSegmentsReceived}
        onSeek={onSeekToTimestamp}
        currentTime={currentTime}
        isPlaying={isPlaying}
        onPlayPause={onPlayPause}
      />
    </>
  );
};

export default TvTranscriptionSection;
