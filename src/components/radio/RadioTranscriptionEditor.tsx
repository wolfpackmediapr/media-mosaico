import React, { useEffect, useRef } from "react";
import { TranscriptionResult } from "@/services/audio/transcriptionService";
import { useTranscriptionEditor } from "@/hooks/radio/useTranscriptionEditor";
import { TranscriptionEditorWrapper } from "./editor/TranscriptionEditorWrapper";

interface RadioTranscriptionEditorProps {
  transcriptionText: string;
  isProcessing: boolean;
  onTranscriptionChange: (text: string) => void;
  transcriptionId?: string;
  transcriptionResult?: TranscriptionResult;
  onTimestampClick?: (timestamp: number) => void;
  registerReset?: (resetFn: () => void) => void;
  currentTime?: number;
}

const RadioTranscriptionEditor = ({
  transcriptionText,
  isProcessing,
  onTranscriptionChange,
  transcriptionId,
  transcriptionResult,
  onTimestampClick,
  registerReset,
  currentTime,
}: RadioTranscriptionEditorProps) => {
  const {
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
    resetLocalSpeakerText
  } = useTranscriptionEditor({
    transcriptionText,
    transcriptionId,
    transcriptionResult,
    onTranscriptionChange,
  });

  // Register reset function with parent
  useEffect(() => {
    if (registerReset) {
      console.log('[RadioTranscriptionEditor] Registering reset function with parent');
      registerReset(() => {
        console.log('[RadioTranscriptionEditor] Reset triggered by parent');
        resetLocalSpeakerText();
      });
    }
  }, [registerReset, resetLocalSpeakerText]);

  // Also monitor transcriptionText - if it's cleared, reset editor
  useEffect(() => {
    if (transcriptionText === '') {
      console.log('[RadioTranscriptionEditor] Empty transcription text detected, resetting');
      resetLocalSpeakerText();
    }
  }, [transcriptionText, resetLocalSpeakerText]);

  return (
    <TranscriptionEditorWrapper
      transcriptionResult={transcriptionResult}
      transcriptionText={localText}
      isProcessing={isProcessing}
      onTranscriptionChange={handleTextChange}
      onTimestampClick={onTimestampClick}
      currentTime={currentTime}
      isSaving={isSaving}
      saveError={saveError}
      saveSuccess={saveSuccess}
      hasSpeakerLabels={hasSpeakerLabels}
      isEditing={isEditing}
      transcriptionId={transcriptionId}
    />
  );
};

export default RadioTranscriptionEditor;
