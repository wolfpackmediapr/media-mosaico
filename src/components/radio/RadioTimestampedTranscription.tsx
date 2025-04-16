
import { useState, useEffect, useMemo } from "react";
import { TranscriptionResult } from "@/services/audio/transcriptionService";
import TimestampControls from "./timestamped/TimestampControls";
import EmptyTimestampState from "./timestamped/EmptyTimestampState";
import { useViewModeManager } from "./timestamped/ViewModeManager";
import TranscriptionContent from "./timestamped/TranscriptionContent";
import { useSrtGenerator } from "./timestamped/SrtGenerator";

interface RadioTimestampedTranscriptionProps {
  transcriptionResult?: TranscriptionResult;
  text: string;
  onTimestampClick?: (timestamp: number) => void;
}

const RadioTimestampedTranscription = ({
  transcriptionResult,
  text,
  onTimestampClick = () => {}
}: RadioTimestampedTranscriptionProps) => {
  // Use the view mode manager hook
  const {
    viewMode,
    timestampedItems,
    canToggleViewMode,
    toggleViewMode,
    getViewModeName,
    getNextViewModeName
  } = useViewModeManager({ transcriptionResult });
  
  // Use the SRT generator hook
  const { handleDownloadSRT } = useSrtGenerator({
    viewMode,
    timestampedItems,
    transcriptionResult
  });

  if (timestampedItems.length === 0) {
    return <EmptyTimestampState />;
  }

  return (
    <div className="border rounded-md">
      <TimestampControls
        viewMode={viewMode}
        canToggleViewMode={canToggleViewMode}
        onToggleViewMode={toggleViewMode}
        onDownloadSRT={handleDownloadSRT}
        viewModeName={getViewModeName()}
        nextViewModeName={getNextViewModeName()}
      />
      
      <TranscriptionContent
        viewMode={viewMode}
        timestampedItems={timestampedItems}
        utterances={transcriptionResult?.utterances}
        onTimestampClick={onTimestampClick}
      />
    </div>
  );
};

export default RadioTimestampedTranscription;
