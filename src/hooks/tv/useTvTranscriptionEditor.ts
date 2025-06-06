import { TranscriptionResult } from "@/services/audio/transcriptionService";
import { useSpeakerTextState } from "../radio/editor/useSpeakerTextState";
import { useTranscriptionSave } from "../radio/editor/useTranscriptionSave";
import { useCallback } from "react";
import { hasSpeakerData } from "../radio/utils/transcriptionUtils";

interface UseTvTranscriptionEditorProps {
  transcriptionText: string;
  transcriptionId?: string;
  transcriptionResult?: TranscriptionResult;
  onTranscriptionChange: (text: string) => void;
}

export const useTvTranscriptionEditor = ({
  transcriptionText,
  transcriptionId,
  transcriptionResult,
  onTranscriptionChange,
}: UseTvTranscriptionEditorProps) => {
  // Handle speaker text state (without utterances fetching)
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

  // Handle autosave functionality for TV transcriptions
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
    isLoadingUtterances: false, // TV doesn't load utterances
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