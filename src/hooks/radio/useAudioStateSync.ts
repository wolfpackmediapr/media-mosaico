
import { useEffect, useRef } from 'react';

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
  // Use a ref to track previous values and avoid unnecessary updates
  const prevPersistedTextRef = useRef(persistedText);
  const prevTranscriptionTextRef = useRef(transcriptionText);
  
  // Sync with persisted text when it changes
  useEffect(() => {
    if (persistedText && 
        persistedText !== transcriptionText && 
        persistedText !== prevPersistedTextRef.current) {
      setTranscriptionText(persistedText);
      prevPersistedTextRef.current = persistedText;
    }
  }, [persistedText, transcriptionText, setTranscriptionText]);

  // Notify parent of text changes
  useEffect(() => {
    if (onTextChange && 
        transcriptionText && 
        transcriptionText !== persistedText && 
        transcriptionText !== prevTranscriptionTextRef.current) {
      onTextChange(transcriptionText);
      prevTranscriptionTextRef.current = transcriptionText;
    }
  }, [transcriptionText, onTextChange, persistedText]);
};
