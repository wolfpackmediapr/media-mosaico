
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

  const [enhancedTranscriptionResult, setEnhancedTranscriptionResult] =
    useState<TranscriptionResult | undefined>(transcriptionResult);
  
  const lastTextRef = useRef(transcriptionText);
  const isUpdatingRef = useRef(false);

  const hasSpeakerLabels = Boolean(
    enhancedTranscriptionResult?.utterances &&
    enhancedTranscriptionResult.utterances.length > 0
  );

  const [localSpeakerText, setLocalSpeakerText, removeLocalSpeakerText] = usePersistentState(
    `radio-transcription-speaker-${transcriptionId || "draft"}`,
    "",
    { storage: 'sessionStorage' }
  );

  useEffect(() => {
    // Skip if we're in the middle of a user-initiated update
    if (isUpdatingRef.current) return;
    
    if (transcriptionResult?.utterances && transcriptionResult.utterances.length > 0) {
      console.log('[useSpeakerTextState] New transcription result with utterances received');
      setEnhancedTranscriptionResult(transcriptionResult);
      const formattedText = formatSpeakerText(transcriptionResult.utterances);
      if (formattedText && localSpeakerText !== formattedText) {
        console.log('[useSpeakerTextState] Setting formatted speaker text from utterances');
        setLocalSpeakerText(formattedText);
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

  // Optimized text change handler with debounce logic
  const handleTextChange = useCallback((newText: string) => {
    if (!newText || newText === lastTextRef.current) return;
    
    // Set a flag to prevent the effect from reprocessing this update
    isUpdatingRef.current = true;
    
    lastTextRef.current = newText;
    setLocalSpeakerText(newText);
    onTranscriptionChange(newText);
    
    // When user is editing, only parse speaker text after they've finished typing
    // to avoid constant re-parsing on every keystroke
    const parseSpeakerText = () => {
      const newUtterances = parseSpeakerTextToUtterances(newText);
      if (newUtterances.length > 0) {
        setEnhancedTranscriptionResult(prev => ({
          ...(prev || {}),
          text: newText,
          utterances: newUtterances
        } as TranscriptionResult));
      }
    };
    
    // Only parse if not in edit mode or if we need to ensure consistent state
    if (!isEditing) {
      parseSpeakerText();
      setIsEditing(true);
    }
    
    // Reset update flag after a short delay
    setTimeout(() => {
      isUpdatingRef.current = false;
    }, 100);
  }, [isEditing, setIsEditing, setLocalSpeakerText, onTranscriptionChange]);

  const resetLocalSpeakerText = () => {
    console.log('[useSpeakerTextState] Resetting local speaker text');
    removeLocalSpeakerText();
    setLocalSpeakerText("");
    setIsEditing(false);
  };

  const toggleEditMode = () => {
    setIsEditing(!isEditing);
  };

  return {
    localText: localSpeakerText,
    isEditing,
    handleTextChange,
    toggleEditMode,
    hasSpeakerLabels,
    resetLocalSpeakerText,
    enhancedTranscriptionResult,
    setEnhancedTranscriptionResult
  };
};
