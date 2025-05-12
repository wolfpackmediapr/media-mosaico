
import { TranscriptionResult } from "@/services/audio/transcriptionService";
import { useSpeakerTextState } from "./editor/useSpeakerTextState";
import { useFetchUtterances } from "./editor/useFetchUtterances";
import { useTranscriptionSave } from "./editor/useTranscriptionSave";

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
  const { isSaving, saveError, saveSuccess } = useTranscriptionSave({
    transcriptionId,
    localText
  });

  // Add these properties to fix the errors in RadioTranscriptionEditor.tsx
  const showTimestamps = hasSpeakerLabels;
  const hasTimestampData = hasSpeakerLabels;

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
    enhancedTranscriptionResult
  };
};
