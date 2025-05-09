
import { useState, useEffect, useRef, useCallback } from "react";
import { usePersistentState } from "@/hooks/use-persistent-state";
import { 
  TranscriptionResult, 
  UtteranceTimestamp 
} from "@/services/audio/transcriptionService";
import { 
  formatSpeakerText, 
  parseSpeakerTextToUtterances,
  formatPlainTextAsSpeaker 
} from "@/components/radio/utils/speakerTextUtils";
import { useDebounce } from "@/hooks/useDebounce";

interface UseSpeakerTextStateProps {
  transcriptionText: string;
  transcriptionId?: string;
  transcriptionResult?: TranscriptionResult;
  onTranscriptionChange: (text: string) => void;
}

export const useSpeakerTextState = ({
  transcriptionText,
  transcriptionId,
  transcriptionResult,
  onTranscriptionChange,
}: UseSpeakerTextStateProps) => {
  const [isEditing, setIsEditing] = usePersistentState(
    `transcription-editor-mode-${transcriptionId || "draft"}`,
    false,
    { storage: 'sessionStorage' }
  );

  // Local state to manage temporary edits before propagating to parent
  const [localEditText, setLocalEditText] = useState("");
  
  // Debounced text that will be sent to parent
  const debouncedText = useDebounce(localEditText, 300);

  const [enhancedTranscriptionResult, setEnhancedTranscriptionResult] =
    useState<TranscriptionResult | undefined>(transcriptionResult);
  
  const lastTextRef = useRef(transcriptionText);
  const isUpdatingRef = useRef(false);
  const skipNextUpdateRef = useRef(false);

  const hasSpeakerLabels = Boolean(
    enhancedTranscriptionResult?.utterances &&
    enhancedTranscriptionResult.utterances.length > 0
  );

  const [localSpeakerText, setLocalSpeakerText, removeLocalSpeakerText] = usePersistentState(
    `radio-transcription-speaker-${transcriptionId || "draft"}`,
    "",
    { storage: 'sessionStorage' }
  );

  // Initialize local edit text when transcription changes
  useEffect(() => {
    if (localSpeakerText && !localEditText) {
      setLocalEditText(localSpeakerText);
    } else if (transcriptionText && !localEditText && !localSpeakerText) {
      setLocalEditText(transcriptionText);
    }
  }, [transcriptionText, localSpeakerText, localEditText]);

  // Process incoming transcription data
  useEffect(() => {
    // Skip if we're in the middle of a user-initiated update
    if (isUpdatingRef.current || skipNextUpdateRef.current) {
      skipNextUpdateRef.current = false;
      return;
    }
    
    if (transcriptionResult?.utterances && transcriptionResult.utterances.length > 0) {
      console.log('[useSpeakerTextState] New transcription result with utterances received');
      setEnhancedTranscriptionResult(transcriptionResult);
      const formattedText = formatSpeakerText(transcriptionResult.utterances);
      if (formattedText && localSpeakerText !== formattedText) {
        console.log('[useSpeakerTextState] Setting formatted speaker text from utterances');
        setLocalSpeakerText(formattedText);
        setLocalEditText(formattedText);
        if (formattedText !== lastTextRef.current) {
          lastTextRef.current = formattedText;
          onTranscriptionChange(formattedText);
        }
      }
    } 
    else if (transcriptionText && transcriptionText !== lastTextRef.current) {
      console.log('[useSpeakerTextState] Processing plain transcription text');
      const formattedText = formatPlainTextAsSpeaker(transcriptionText);
      setLocalSpeakerText(formattedText);
      setLocalEditText(formattedText);
      lastTextRef.current = formattedText;
      onTranscriptionChange(formattedText);
      
      const parsedUtterances = parseSpeakerTextToUtterances(formattedText);
      if (parsedUtterances.length > 0) {
        setEnhancedTranscriptionResult(prev => ({
          ...(prev || {}),
          text: formattedText,
          utterances: parsedUtterances
        }) as TranscriptionResult);
      }
    }
  }, [transcriptionResult, transcriptionText, setLocalSpeakerText, onTranscriptionChange, localSpeakerText]);

  // Effect to propagate debounced changes to parent
  useEffect(() => {
    if (debouncedText && debouncedText !== lastTextRef.current) {
      lastTextRef.current = debouncedText;
      setLocalSpeakerText(debouncedText);
      onTranscriptionChange(debouncedText);
    }
  }, [debouncedText, onTranscriptionChange, setLocalSpeakerText]);

  // Modified text change handler to accept string input directly
  const handleTextChange = useCallback((text: string) => {
    if (!text || text === lastTextRef.current) return;
    
    // Set local state immediately for UI feedback
    setLocalEditText(text);
    
    // Mark that we're in a user-initiated update to prevent
    // the effect from reprocessing this update
    isUpdatingRef.current = true;
    
    // When user is editing, only parse speaker text after they've finished typing
    // to avoid constant re-parsing on every keystroke
    if (isEditing) {
      skipNextUpdateRef.current = true;
    }
    
    // Reset update flag after a short delay
    setTimeout(() => {
      isUpdatingRef.current = false;
    }, 300);
  }, [isEditing]);

  const resetLocalSpeakerText = useCallback(() => {
    console.log('[useSpeakerTextState] Resetting local speaker text');
    removeLocalSpeakerText();
    setLocalSpeakerText("");
    setLocalEditText("");
    setIsEditing(false);
    lastTextRef.current = "";
  }, [removeLocalSpeakerText, setLocalSpeakerText, setIsEditing]);

  const toggleEditMode = useCallback(() => {
    setIsEditing(!isEditing);
  }, [isEditing, setIsEditing]);

  return {
    localText: localEditText || localSpeakerText || transcriptionText,
    isEditing,
    handleTextChange,
    toggleEditMode,
    hasSpeakerLabels,
    resetLocalSpeakerText,
    enhancedTranscriptionResult,
    setEnhancedTranscriptionResult
  };
};
