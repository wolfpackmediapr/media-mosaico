
import { TranscriptionResult } from "@/services/audio/transcriptionService";
import { useSpeakerTextState } from "./editor/useSpeakerTextState";
import { useFetchUtterances } from "./editor/useFetchUtterances";
import { useTranscriptionSave } from "./editor/useTranscriptionSave";
import { useCallback } from "react";

interface UseTranscriptionEditorProps {
  transcriptionText: string;
  transcriptionId?: string;
  transcriptionResult?: TranscriptionResult;
  onTranscriptionChange: (text: string) => void;
}

export const useTranscriptionEditor = ({
  transcriptionText,
  transcriptionId,
  transcriptionResult,
  onTranscriptionChange,
}: UseTranscriptionEditorProps) => {
  // Handle speaker text state
  const {
    localText,
    isEditing,
    handleTextChange: handleSpeakerTextChange,
    toggleEditMode,
    hasSpeakerLabels,
    resetLocalSpeakerText,
    enhancedTranscriptionResult,
    setEnhancedTranscriptionResult
  } = useSpeakerTextState({
    transcriptionText,
    transcriptionId,
    transcriptionResult,
    onTranscriptionChange
  });

  // Create a compatible handler that can accept either string or event
  const handleTextChange = useCallback((textOrEvent: string | React.ChangeEvent<HTMLTextAreaElement>) => {
    // If it's an event, extract the value
    if (typeof textOrEvent !== 'string' && textOrEvent.target) {
      handleSpeakerTextChange(textOrEvent.target.value);
    } else if (typeof textOrEvent === 'string') {
      // If it's already a string, pass it directly
      handleSpeakerTextChange(textOrEvent);
    }
  }, [handleSpeakerTextChange]);

  // Fetch utterances if needed
  const { isLoadingUtterances } = useFetchUtterances({
    transcriptionId,
    transcriptionText,
    enhancedTranscriptionResult,
    setEnhancedTranscriptionResult,
    setLocalSpeakerText: handleSpeakerTextChange,
    onTranscriptionChange
  });

  // Handle autosave functionality
  const { isSaving, saveError, saveSuccess } = useTranscriptionSave({
    transcriptionId,
    localText
  });

  return {
    localText,
    isEditing,
    isLoadingUtterances,
    isSaving,
    saveError,
    saveSuccess,
    handleTextChange,
    toggleEditMode,
    hasSpeakerLabels,
    resetLocalSpeakerText,
    enhancedTranscriptionResult
  };
};
