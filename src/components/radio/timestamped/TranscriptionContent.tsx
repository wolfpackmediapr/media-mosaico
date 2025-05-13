
import React from "react";
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
  emptyMessage?: string;
}

const TranscriptionContent: React.FC<TranscriptionContentProps> = ({
  viewMode,
  timestampedItems,
  onTimestampClick,
  isLoading = false,
  emptyMessage = "No hay datos de timestamps disponibles"
}) => {
  if (isLoading) {
    return (
      <div className="p-4 space-y-3" data-testid="transcription-loading">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={`skeleton-${i}`} className="flex gap-2">
            <div className="h-5 w-14 bg-muted animate-pulse rounded" />
            <div className="h-5 flex-1 bg-muted animate-pulse rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (!timestampedItems || timestampedItems.length === 0) {
    return (
      <div className="p-4 border rounded-md bg-muted/20 min-h-[200px] flex items-center justify-center">
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <TimestampedList
      items={timestampedItems}
      viewMode={viewMode}
      formatTime={formatTime}
      onItemClick={onTimestampClick}
    />
  );
};

export default React.memo(TranscriptionContent);
