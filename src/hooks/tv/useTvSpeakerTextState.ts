import { useState, useEffect, useRef } from "react";
import { usePersistentState } from "@/hooks/use-persistent-state";
import { 
  TranscriptionResult, 
  UtteranceTimestamp 
} from "@/services/audio/transcriptionService";
import { 
  formatTvSpeakerText, 
  parseTvSpeakerTextToUtterances,
  formatPlainTextAsTvSpeaker 
} from "@/utils/tv/tvSpeakerTextUtils";

interface UseTvSpeakerTextStateProps {
  transcriptionText: string;
  transcriptionId?: string;
  transcriptionResult?: TranscriptionResult;
  onTranscriptionChange: (text: string) => void;
}

export const useTvSpeakerTextState = ({
  transcriptionText,
  transcriptionId,
  transcriptionResult,
  onTranscriptionChange,
}: UseTvSpeakerTextStateProps) => {
  const mountedRef = useRef(true);
  const persistKey = `tv-transcription-speaker-${transcriptionId || "draft"}`;

  const [isEditing, setIsEditing, removeEditorMode] = usePersistentState(
    `tv-transcription-editor-mode-${transcriptionId || "draft"}`,
    false,
    { storage: 'sessionStorage' }
  );

  const [enhancedTranscriptionResult, setEnhancedTranscriptionResult] =
    useState<TranscriptionResult | undefined>(transcriptionResult);
  
  const lastTextRef = useRef(transcriptionText);

  const hasSpeakerLabels = Boolean(
    enhancedTranscriptionResult?.utterances &&
    enhancedTranscriptionResult.utterances.length > 0
  );

  const [localSpeakerText, setLocalSpeakerText, removeLocalSpeakerText] = usePersistentState(
    persistKey,
    "",
    { storage: 'sessionStorage' }
  );

  // Check if transcription text has been cleared
  useEffect(() => {
    if (!transcriptionText && localSpeakerText) {
      console.log('[useTvSpeakerTextState] Transcription text was cleared. Clearing speaker text.');
      removeLocalSpeakerText();
      setLocalSpeakerText("");
      lastTextRef.current = "";
    }
  }, [transcriptionText, localSpeakerText, setLocalSpeakerText, removeLocalSpeakerText]);

  // Process transcription result and text
  useEffect(() => {
    if (!mountedRef.current) return;

    if (transcriptionResult?.utterances && transcriptionResult.utterances.length > 0) {
      console.log('[useTvSpeakerTextState] New transcription result with utterances received');
      setEnhancedTranscriptionResult(transcriptionResult);
      const formattedText = formatTvSpeakerText(transcriptionResult.utterances);
      if (formattedText && localSpeakerText !== formattedText) {
        console.log('[useTvSpeakerTextState] Setting formatted TV speaker text from utterances');
        setLocalSpeakerText(formattedText);
        if (formattedText !== lastTextRef.current) {
          lastTextRef.current = formattedText;
          onTranscriptionChange(formattedText);
        }
      }
    } 
    else if (transcriptionText && transcriptionText !== lastTextRef.current) {
      console.log('[useTvSpeakerTextState] Processing TV transcription text from database');
      
      // FIRST: Parse the text to extract Gemini names and create utterances
      const parsedUtterances = parseTvSpeakerTextToUtterances(transcriptionText);
      
      if (parsedUtterances.length > 0) {
        // THEN: Format back to text with names as prefixes in dialogue
        const formattedText = formatTvSpeakerText(parsedUtterances);
        setLocalSpeakerText(formattedText);
        lastTextRef.current = formattedText;
        onTranscriptionChange(formattedText);
        
        // Store the enhanced result with parsed utterances
        setEnhancedTranscriptionResult(prev => ({
          ...(prev || {}),
          text: formattedText,
          utterances: parsedUtterances
        }) as TranscriptionResult);
      } else {
        // Fallback for text without proper speaker format
        const formattedText = formatPlainTextAsTvSpeaker(transcriptionText);
        setLocalSpeakerText(formattedText);
        lastTextRef.current = formattedText;
        onTranscriptionChange(formattedText);
      }
    }
  }, [transcriptionResult, transcriptionText, setLocalSpeakerText, onTranscriptionChange, localSpeakerText]);

  // More robust reset function that clears all associated state
  const resetLocalSpeakerText = () => {
    if (!mountedRef.current) return;
    
    console.log('[useTvSpeakerTextState] Performing full reset of local speaker text');
    
    // Remove from session storage
    removeLocalSpeakerText();
    removeEditorMode();
    
    // Clear state
    setLocalSpeakerText("");
    setIsEditing(false);
    lastTextRef.current = "";
    
    // Also try direct removal from session storage as a backup
    try {
      sessionStorage.removeItem(persistKey);
      sessionStorage.removeItem(`tv-transcription-editor-mode-${transcriptionId || "draft"}`);
    } catch (e) {
      console.error('[useTvSpeakerTextState] Error directly clearing storage:', e);
    }
  };

  // Handle text change
  const handleTextChange = (newText: string) => {
    if (!mountedRef.current || (!newText && !localSpeakerText)) return;
    
    lastTextRef.current = newText;
    setLocalSpeakerText(newText);
    onTranscriptionChange(newText);
    
    const newUtterances = parseTvSpeakerTextToUtterances(newText);
    if (newUtterances.length > 0) {
      setEnhancedTranscriptionResult(prev => ({
        ...(prev || {}),
        text: newText,
        utterances: newUtterances
      } as TranscriptionResult));
    }
    
    if (!isEditing) setIsEditing(true);
  };

  const toggleEditMode = () => {
    setIsEditing(!isEditing);
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

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
