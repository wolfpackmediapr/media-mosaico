
import { useState, useEffect, useRef } from "react";
import { usePersistentState } from "@/hooks/use-persistent-state";
import { 
  TranscriptionResult, 
  UtteranceTimestamp 
} from "@/services/audio/transcriptionService";
import { 
  formatSpeakerText, 
  parseSpeakerTextToUtterances,
  formatPlainTextAsSpeaker,
  applySpeakerLabelsToText
} from "@/components/radio/utils/speakerTextUtils";
import { useSpeakerLabels } from "@/hooks/radio/speaker-labels/useSpeakerLabels";

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
  const mountedRef = useRef(true);
  const persistKey = `radio-transcription-speaker-${transcriptionId || "draft"}`;

  const [isEditing, setIsEditing, removeEditorMode] = usePersistentState(
    `transcription-editor-mode-${transcriptionId || "draft"}`,
    false,
    { storage: 'sessionStorage' }
  );

  const [enhancedTranscriptionResult, setEnhancedTranscriptionResult] =
    useState<TranscriptionResult | undefined>(transcriptionResult);
  
  const lastTextRef = useRef(transcriptionText);

  // Speaker labels integration
  const { speakerLabels, getSpeakerDisplayName } = useSpeakerLabels({ 
    transcriptionId 
  });

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
      console.log('[useSpeakerTextState] Transcription text was cleared. Clearing speaker text.');
      removeLocalSpeakerText();
      setLocalSpeakerText("");
      lastTextRef.current = "";
    }
  }, [transcriptionText, localSpeakerText, setLocalSpeakerText, removeLocalSpeakerText]);

  //Process transcription result and text with speaker labels
  useEffect(() => {
    if (!mountedRef.current) return;

    if (transcriptionResult?.utterances && transcriptionResult.utterances.length > 0) {
      console.log('[useSpeakerTextState] New transcription result with utterances received');
      setEnhancedTranscriptionResult(transcriptionResult);
      const formattedText = formatSpeakerText(transcriptionResult.utterances, speakerLabels);
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
      const textWithLabels = applySpeakerLabelsToText(formattedText, speakerLabels);
      setLocalSpeakerText(textWithLabels);
      lastTextRef.current = textWithLabels;
      onTranscriptionChange(textWithLabels);
      
      const parsedUtterances = parseSpeakerTextToUtterances(textWithLabels, speakerLabels);
      if (parsedUtterances.length > 0) {
        setEnhancedTranscriptionResult(prev => ({
          ...(prev || {}),
          text: textWithLabels,
          utterances: parsedUtterances
        }) as TranscriptionResult);
      }
    }
  }, [transcriptionResult, transcriptionText, setLocalSpeakerText, onTranscriptionChange, localSpeakerText, speakerLabels]);

  // Update text when speaker labels change
  useEffect(() => {
    if (localSpeakerText && Object.keys(speakerLabels).length > 0) {
      const updatedText = applySpeakerLabelsToText(localSpeakerText, speakerLabels);
      if (updatedText !== localSpeakerText) {
        setLocalSpeakerText(updatedText);
        onTranscriptionChange(updatedText);
        
        // Update enhanced result as well
        const parsedUtterances = parseSpeakerTextToUtterances(updatedText, speakerLabels);
        if (parsedUtterances.length > 0) {
          setEnhancedTranscriptionResult(prev => ({
            ...(prev || {}),
            text: updatedText,
            utterances: parsedUtterances
          }) as TranscriptionResult);
        }
      }
    }
  }, [speakerLabels, localSpeakerText, setLocalSpeakerText, onTranscriptionChange]);

  // More robust reset function that clears all associated state
  const resetLocalSpeakerText = () => {
    if (!mountedRef.current) return;
    
    console.log('[useSpeakerTextState] Performing full reset of local speaker text');
    
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
      sessionStorage.removeItem(`transcription-editor-mode-${transcriptionId || "draft"}`);
    } catch (e) {
      console.error('[useSpeakerTextState] Error directly clearing storage:', e);
    }
  };

  // Handle text change
  const handleTextChange = (newText: string) => {
    if (!mountedRef.current || (!newText && !localSpeakerText)) return;
    
    lastTextRef.current = newText;
    setLocalSpeakerText(newText);
    onTranscriptionChange(newText);
    
    const newUtterances = parseSpeakerTextToUtterances(newText, speakerLabels);
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
