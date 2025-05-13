
import { useEffect } from "react";
import { debounce } from "lodash";

interface AudioStateSyncOptions {
  persistedText?: string;
  transcriptionText?: string;
  setTranscriptionText?: (text: string) => void;
  onTextChange?: (text: string) => void;
}

export const useAudioStateSync = ({
  persistedText = "",
  transcriptionText = "",
  setTranscriptionText = () => {},
  onTextChange
}: AudioStateSyncOptions) => {
  // Sync transcription text with persisted text when component mounts
  useEffect(() => {
    if (persistedText && !transcriptionText && setTranscriptionText) {
      console.log('[useAudioStateSync] Syncing persisted text to transcription');
      setTranscriptionText(persistedText);
    }
  }, [persistedText, transcriptionText, setTranscriptionText]);

  // Debounced text syncing to avoid excessive storage operations
  useEffect(() => {
    if (!onTextChange || !transcriptionText) return;

    const debouncedSync = debounce(() => {
      console.log('[useAudioStateSync] Syncing transcription to persisted storage');
      onTextChange(transcriptionText);
    }, 1000);

    debouncedSync();
    
    return () => {
      debouncedSync.cancel();
    };
  }, [transcriptionText, onTextChange]);
};
