
import { formatSpeakerTranscript } from "./speakerUtils";
import { useTimestampedDownload } from "./useTimestampedDownload";
import { TimestampedItem } from "./ViewModeManager";
import { TranscriptionResult } from "@/services/audio/transcriptionService";

interface SrtGeneratorProps {
  viewMode: 'speaker' | 'sentence' | 'word';
  timestampedItems: TimestampedItem[];
  transcriptionResult?: TranscriptionResult;
}

export const useSrtGenerator = ({
  viewMode,
  timestampedItems,
  transcriptionResult
}: SrtGeneratorProps) => {
  const { downloadSRT } = useTimestampedDownload();
  
  // Generate SRT content based on the current view mode
  const getSrtContent = () => {
    if (viewMode === 'speaker' && transcriptionResult?.utterances) {
      return formatSpeakerTranscript(transcriptionResult.utterances);
    }
    return null; // Let the existing logic handle other modes
  };
  
  const handleDownloadSRT = () => {
    downloadSRT(timestampedItems, getSrtContent());
  };

  return { handleDownloadSRT };
};
