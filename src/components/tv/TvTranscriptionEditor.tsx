import React, { useEffect } from "react";
import { TranscriptionResult } from "@/services/audio/transcriptionService";
import { useTranscriptionEditor } from "@/hooks/radio/useTranscriptionEditor";
import { TranscriptionEditorWrapper } from "@/components/radio/editor/TranscriptionEditorWrapper";

interface TvTranscriptionEditorProps {
  transcriptionText: string;
  isProcessing: boolean;
  onTranscriptionChange: (text: string) => void;
  transcriptionId?: string;
  transcriptionResult?: TranscriptionResult;
  onTimestampClick?: (timestamp: number) => void;
  registerReset?: (resetFn: () => void) => void;
  currentTime?: number;
}

const TvTranscriptionEditor = ({
  transcriptionText,
  isProcessing,
  onTranscriptionChange,
  transcriptionId,
  transcriptionResult,
  onTimestampClick,
  registerReset,
  currentTime,
}: TvTranscriptionEditorProps) => {
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

  // Register reset function with parent only once
  useEffect(() => {
    if (registerReset) {
      console.log('[TvTranscriptionEditor] Registering reset function with parent');
      registerReset(() => {
        console.log('[TvTranscriptionEditor] Reset triggered by parent');
        resetLocalSpeakerText();
      });
    }
  }, [registerReset]); // Remove resetLocalSpeakerText from dependencies to prevent infinite loop

  // Monitor transcriptionText - if it's cleared, reset editor
  useEffect(() => {
    if (transcriptionText === '') {
      console.log('[TvTranscriptionEditor] Empty transcription text detected, resetting');
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
    />
  );
};

export default TvTranscriptionEditor;