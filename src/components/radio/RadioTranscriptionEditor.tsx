
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
    saveSuccess,
    enhancedTranscriptionResult
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

  // Handle changes from the editor component
  const handleTranscriptionChange = (text: string) => {
    handleTextChange(text);
  };

  const finalIsProcessing = isProcessing || isLoadingUtterances;
  console.log('[RadioTranscriptionEditor] Processing state:', {
    isProcessing,
    isLoadingUtterances,
    finalIsProcessing
  });

  return (
    <TranscriptionEditorWrapper
      transcriptionResult={enhancedTranscriptionResult || transcriptionResult}
      transcriptionText={localText || transcriptionText}
      isProcessing={finalIsProcessing}
      onTranscriptionChange={handleTranscriptionChange}
      onTimestampClick={onTimestampClick}
      currentTime={currentTime}
      isSaving={isSaving}
      hasSpeakerLabels={hasSpeakerLabels}
      saveError={saveError}
      saveSuccess={saveSuccess}
      isEditing={isEditing}
    />
  );
};

export default RadioTranscriptionEditor;
