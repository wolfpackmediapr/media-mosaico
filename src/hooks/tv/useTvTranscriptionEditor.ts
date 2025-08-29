import { TranscriptionResult } from "@/services/audio/transcriptionService";
import { useSpeakerTextState } from "../radio/editor/useSpeakerTextState";
import { useTranscriptionSave } from "../radio/editor/useTranscriptionSave";
import { useCallback, useMemo } from "react";
import { hasSpeakerData } from "../radio/utils/transcriptionUtils";
import { parseTvSpeakerText } from "@/utils/tv/speakerTextParser";

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

  // Parse TV speaker data from Gemini transcription (no external API calls)
  const tvUtterances = useMemo(() => {
    if (!transcriptionText) return [];
    return parseTvSpeakerText(transcriptionText);
  }, [transcriptionText]);

  // Update enhanced transcription result with TV utterances
  useMemo(() => {
    if (tvUtterances.length > 0 && !enhancedTranscriptionResult?.utterances) {
      setEnhancedTranscriptionResult({
        ...transcriptionResult,
        utterances: tvUtterances,
        text: transcriptionText
      });
    }
  }, [tvUtterances, enhancedTranscriptionResult, transcriptionResult, transcriptionText, setEnhancedTranscriptionResult]);

  // TV transcriptions don't load from external API
  const isLoadingUtterances = false;

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