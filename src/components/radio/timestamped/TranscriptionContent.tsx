
import { TranscriptionResult, UtteranceTimestamp } from "@/services/audio/transcriptionService";
import TimestampedList from "./TimestampedList";
import { formatTime } from "./timeUtils";
import { ViewMode, TimestampedItem } from "./ViewModeManager";

interface TranscriptionContentProps {
  viewMode: ViewMode;
  timestampedItems: TimestampedItem[];
  utterances?: UtteranceTimestamp[];
  onTimestampClick: (timestamp: number) => void;
  isLoading?: boolean;
}

const TranscriptionContent = ({
  viewMode,
  timestampedItems,
  onTimestampClick,
  isLoading = false
}: TranscriptionContentProps) => {
  return (
    <TimestampedList
      items={timestampedItems}
      viewMode={viewMode}
      formatTime={formatTime}
      onItemClick={onTimestampClick}
      isLoading={isLoading}
    />
  );
};

export default TranscriptionContent;
