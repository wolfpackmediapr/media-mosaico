
import { useState, useMemo } from "react";
import { TranscriptionResult } from "@/services/audio/transcriptionService";
import TimestampControls from "./timestamped/TimestampControls";
import TimestampedList from "./timestamped/TimestampedList";
import EmptyTimestampState from "./timestamped/EmptyTimestampState";
import { formatTime } from "./timestamped/timeUtils";
import { useTimestampedDownload } from "./timestamped/useTimestampedDownload";

interface RadioTimestampedTranscriptionProps {
  transcriptionResult?: TranscriptionResult;
  text: string;
  onTimestampClick?: (timestamp: number) => void;
}

interface TimestampedItem {
  text: string;
  start: number;
  end: number;
  type: 'sentence' | 'word';
}

const RadioTimestampedTranscription = ({
  transcriptionResult,
  text,
  onTimestampClick
}: RadioTimestampedTranscriptionProps) => {
  const [viewMode, setViewMode] = useState<'sentence' | 'word'>(
    transcriptionResult?.sentences?.length ? 'sentence' : 'word'
  );
  
  const { downloadSRT } = useTimestampedDownload();
  
  // Generate timestamped items based on available data
  const timestampedItems = useMemo(() => {
    if (!transcriptionResult) return [];
    
    // If we have sentences with timestamps, use them (preferred)
    if (viewMode === 'sentence' && transcriptionResult.sentences && transcriptionResult.sentences.length > 0) {
      return transcriptionResult.sentences.map(sentence => ({
        text: sentence.text,
        start: sentence.start,
        end: sentence.end,
        type: 'sentence' as const
      }));
    }
    
    // Fall back to word-level timestamps
    if (transcriptionResult.words && transcriptionResult.words.length > 0) {
      return transcriptionResult.words.map(word => ({
        text: word.text,
        start: word.start,
        end: word.end,
        type: 'word' as const
      }));
    }
    
    return [];
  }, [transcriptionResult, viewMode]);
  
  const handleItemClick = (timestamp: number) => {
    if (onTimestampClick) {
      onTimestampClick(timestamp);
    }
  };
  
  const toggleViewMode = () => {
    if (viewMode === 'sentence' && transcriptionResult?.words?.length) {
      setViewMode('word');
    } else if (viewMode === 'word' && transcriptionResult?.sentences?.length) {
      setViewMode('sentence');
    }
  };

  const canToggleViewMode = Boolean(
    transcriptionResult?.sentences?.length && 
    transcriptionResult?.words?.length
  );
  
  if (timestampedItems.length === 0) {
    return <EmptyTimestampState />;
  }

  return (
    <div className="border rounded-md">
      <TimestampControls
        viewMode={viewMode}
        canToggleViewMode={canToggleViewMode}
        onToggleViewMode={toggleViewMode}
        onDownloadSRT={() => downloadSRT(timestampedItems)}
      />
      <TimestampedList
        items={timestampedItems}
        viewMode={viewMode}
        formatTime={formatTime}
        onItemClick={handleItemClick}
      />
    </div>
  );
};

export default RadioTimestampedTranscription;
