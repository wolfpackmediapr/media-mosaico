
import { TranscriptionResult, UtteranceTimestamp } from "@/services/audio/transcriptionService";
import SpeakerTimestampedList from "./SpeakerTimestampedList";
import TimestampedList from "./TimestampedList";
import { formatTime } from "./timeUtils";
import { ViewMode, TimestampedItem } from "./ViewModeManager";

interface TranscriptionContentProps {
  viewMode: ViewMode;
  timestampedItems: TimestampedItem[];
  utterances?: UtteranceTimestamp[];
  onTimestampClick: (timestamp: number) => void;
}

const TranscriptionContent = ({
  viewMode,
  timestampedItems,
  utterances,
  onTimestampClick
}: TranscriptionContentProps) => {
  return (
    <>
      {viewMode === 'speaker' && utterances ? (
        <SpeakerTimestampedList
          utterances={utterances}
          onUtteranceClick={onTimestampClick}
        />
      ) : (
        <TimestampedList
          items={timestampedItems}
          viewMode={viewMode === 'word' ? 'word' : 'sentence'}
          formatTime={formatTime}
          onItemClick={onTimestampClick}
        />
      )}
    </>
  );
};

export default TranscriptionContent;
