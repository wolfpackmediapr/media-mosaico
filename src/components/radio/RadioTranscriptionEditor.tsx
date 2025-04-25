
import React from "react";
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
    isSaving,
    handleTextChange,
    hasSpeakerLabels,
    resetLocalSpeakerText,
    saveError,
    saveSuccess
  } = useTranscriptionEditor({
    transcriptionText,
    transcriptionId,
    transcriptionResult,
    onTranscriptionChange,
  });

  // Register the reset function if the prop is provided
  React.useEffect(() => {
    if (registerReset && resetLocalSpeakerText) {
      registerReset(resetLocalSpeakerText);
    }
  }, [registerReset, resetLocalSpeakerText]);

  // Create a wrapper function that adapts between the expected types
  const handleTranscriptionChange = (text: string) => {
    handleTextChange(text);
  };

  return (
    <TranscriptionEditorWrapper
      transcriptionResult={transcriptionResult}
      transcriptionText={localText}
      isProcessing={isProcessing}
      onTranscriptionChange={handleTranscriptionChange}
      onTimestampClick={onTimestampClick}
      currentTime={currentTime}
      isSaving={isSaving}
      hasSpeakerLabels={hasSpeakerLabels}
      saveError={saveError}
      saveSuccess={saveSuccess}
    />
  );
};

export default RadioTranscriptionEditor;
