
import TvTranscriptionSlot from "./TvTranscriptionSlot";
import { NewsSegment } from "@/hooks/use-video-processor";
import { TranscriptionResult } from "@/services/audio/transcriptionService";

interface TvTranscriptionSectionProps {
  textContent: string;
  isProcessing: boolean;
  transcriptionMetadata?: {
    channel?: string;
    program?: string;
    category?: string;
    broadcastTime?: string;
  };
  transcriptionResult?: TranscriptionResult;
  transcriptionId?: string;
  segments?: NewsSegment[];
  notepadContent?: string;
  onTranscriptionChange: (text: string) => void;
  onSeekToTimestamp: (timestamp: number) => void;
  onSegmentsReceived?: (segments: NewsSegment[]) => void;
  registerEditorReset?: (fn: () => void) => void;
  isPlaying?: boolean;
  currentTime?: number;
  onPlayPause?: () => void;
}

const TvTranscriptionSection = ({
  textContent,
  isProcessing,
  transcriptionMetadata,
  transcriptionResult,
  transcriptionId,
  segments = [],
  notepadContent = "",
  onTranscriptionChange,
  onSeekToTimestamp,
  onSegmentsReceived,
  registerEditorReset,
  isPlaying = false,
  currentTime = 0,
  onPlayPause = () => {}
}: TvTranscriptionSectionProps) => {
  
  // Always render the transcription slot, regardless of text content
  return (
    <TvTranscriptionSlot
      isProcessing={isProcessing}
      transcriptionText={textContent}
      transcriptionResult={transcriptionResult}
      transcriptionId={transcriptionId}
      metadata={transcriptionMetadata || {
        channel: "WIPR",
        program: "Noticias Puerto Rico",
        category: "Economía",
        broadcastTime: "2024-03-15T10:00:00Z"
      }}
      segments={segments}
      notepadContent={notepadContent}
      onTranscriptionChange={onTranscriptionChange}
      onSegmentsReceived={onSegmentsReceived}
      onSeek={onSeekToTimestamp}
      registerEditorReset={registerEditorReset}
      isPlaying={isPlaying}
      currentTime={currentTime}
      onPlayPause={onPlayPause}
    />
  );
};

export default TvTranscriptionSection;
