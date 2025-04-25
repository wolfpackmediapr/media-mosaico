
import { useEffect, useRef, useCallback } from 'react';
import { debounce } from 'lodash';

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
  const prevPersistedTextRef = useRef(persistedText);
  const prevTranscriptionTextRef = useRef(transcriptionText);
  
  // Debounced text change handler to reduce unnecessary updates
  const debouncedTextChange = useCallback(
    debounce((text: string) => {
      if (onTextChange) {
        onTextChange(text);
      }
    }, 500),
    [onTextChange]
  );
  
  // Sync with persisted text when it changes
  useEffect(() => {
    if (persistedText && 
        persistedText !== transcriptionText && 
        persistedText !== prevPersistedTextRef.current) {
      setTranscriptionText(persistedText);
      prevPersistedTextRef.current = persistedText;
    }
  }, [persistedText, transcriptionText, setTranscriptionText]);

  // Handle text changes with debouncing
  useEffect(() => {
    if (transcriptionText && 
        transcriptionText !== persistedText && 
        transcriptionText !== prevTranscriptionTextRef.current) {
      debouncedTextChange(transcriptionText);
      prevTranscriptionTextRef.current = transcriptionText;
    }
  }, [transcriptionText, persistedText, debouncedTextChange]);

  // Cleanup
  useEffect(() => {
    return () => {
      debouncedTextChange.cancel();
    };
  }, [debouncedTextChange]);
};
