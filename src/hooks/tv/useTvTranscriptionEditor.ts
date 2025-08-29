import { TranscriptionResult } from "@/services/audio/transcriptionService";
import { useSpeakerTextState } from "../radio/editor/useSpeakerTextState";
import { useFetchUtterances } from "../radio/editor/useFetchUtterances";
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
  // Handle speaker text state (same as radio - with full functionality)
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

  // Fetch utterances if needed (same as radio functionality)
  const { isLoadingUtterances } = useFetchUtterances({
    transcriptionId,
    transcriptionText,
    enhancedTranscriptionResult,
    setEnhancedTranscriptionResult,
    setLocalSpeakerText: handleTextChange,
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
    isLoadingUtterances, // Now uses same loading as radio
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