
import { useEffect } from 'react';

interface AudioStateSyncOptions {
  persistedText?: string;
  transcriptionText: string;
  setTranscriptionText: (text: string) => void;
  onTextChange?: (text: string) => void;
}

export const useAudioStateSync = ({
  persistedText = "",
  transcriptionText,
  setTranscriptionText,
  onTextChange,
}: AudioStateSyncOptions) => {
  // Sync with persisted text when it changes
  useEffect(() => {
    if (persistedText && persistedText !== transcriptionText) {
      setTranscriptionText(persistedText);
    }
  }, [persistedText, transcriptionText, setTranscriptionText]);

  // Notify parent of text changes
  useEffect(() => {
    if (onTextChange && transcriptionText && transcriptionText !== persistedText) {
      onTextChange(transcriptionText);
    }
  }, [transcriptionText, onTextChange, persistedText]);
};
