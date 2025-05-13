
import { TranscriptionResult } from "@/services/audio/transcriptionService";
import { useSpeakerTextState } from "./editor/useSpeakerTextState";
import { useFetchUtterances } from "./editor/useFetchUtterances";
import { useTranscriptionSave } from "./editor/useTranscriptionSave";
import { useCallback } from "react";
import { hasSpeakerData } from "./utils/transcriptionUtils";

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
    handleTextChange,
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

  // Fetch utterances if needed
  const { isLoadingUtterances } = useFetchUtterances({
    transcriptionId,
    transcriptionText,
    enhancedTranscriptionResult,
    setEnhancedTranscriptionResult,
    setLocalSpeakerText: handleTextChange,
    onTranscriptionChange
  });

  // Handle autosave functionality
  const { isSaving, saveError, saveSuccess, forceSave } = useTranscriptionSave({
    transcriptionId,
    localText
  });

  // Computed properties based on speaker labels state
  const showTimestamps = hasSpeakerLabels;
  const hasTimestampData = hasSpeakerLabels;
  
  // Force save method for manual triggers
  const handleForceSave = useCallback(async () => {
    if (transcriptionId && localText) {
      return await forceSave();
    }
    return false;
  }, [forceSave, localText, transcriptionId]);

  // Check if there are actual utterances in the result
  const hasUtterances = useCallback(() => {
    return hasSpeakerData(enhancedTranscriptionResult);
  }, [enhancedTranscriptionResult]);

  return {
    localText,
    isEditing,
    isLoadingUtterances,
    showTimestamps,
    hasTimestampData,
    isSaving,
    saveError,
    saveSuccess,
    handleTextChange,
    toggleEditMode,
    hasSpeakerLabels,
    resetLocalSpeakerText,
    enhancedTranscriptionResult,
    hasUtterances,
    handleForceSave
  };
};
