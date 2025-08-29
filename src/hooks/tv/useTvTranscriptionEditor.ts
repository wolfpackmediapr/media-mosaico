import { TranscriptionResult } from "@/services/audio/transcriptionService";
import { useSpeakerTextState } from "../radio/editor/useSpeakerTextState";
import { useTranscriptionSave } from "../radio/editor/useTranscriptionSave";
import { useFetchUtterances } from "../radio/editor/useFetchUtterances";
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

  // Handle utterance fetching (same as radio)
  const { isLoadingUtterances } = useFetchUtterances({
    transcriptionId,
    transcriptionText,
    enhancedTranscriptionResult,
    setEnhancedTranscriptionResult,
    setLocalSpeakerText: (text: string) => {
      // This needs to be handled by the useSpeakerTextState hook
      // The handleTextChange function will update the local text properly
      handleTextChange(text);
    },
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
    isLoadingUtterances, // Now properly uses the actual loading state
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