
import React, { useEffect } from "react";
import { TranscriptionResult } from "@/services/audio/transcriptionService";
import { useTranscriptionEditor } from "@/hooks/radio/useTranscriptionEditor";
import { TranscriptionEditorWrapper } from "./editor/TranscriptionEditorWrapper";
import { toast } from "sonner";

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
  useEffect(() => {
    if (registerReset && resetLocalSpeakerText) {
      registerReset(resetLocalSpeakerText);
      return () => {
        // Cleanup registration on unmount
        registerReset(() => {});
      };
    }
  }, [registerReset, resetLocalSpeakerText]);

  // Show save success toast
  useEffect(() => {
    if (saveSuccess && !isSaving) {
      toast.success("Transcripción guardada correctamente");
    }
  }, [saveSuccess, isSaving]);

  // Handle changes from the editor component
  const handleTranscriptionChange = (text: string) => {
    handleTextChange(text);
  };

  // Calculate the final processing state with more granular logging
  const finalIsProcessing = isProcessing || isLoadingUtterances;
  console.log('[RadioTranscriptionEditor] Processing state details:', {
    isProcessing,
    isLoadingUtterances,
    finalIsProcessing,
    hasTranscriptionText: !!transcriptionText,
    hasTranscriptionResult: !!transcriptionResult,
    hasEnhancedResult: !!enhancedTranscriptionResult
  });

  // Log when the processing state changes
  useEffect(() => {
    console.log('[RadioTranscriptionEditor] Processing state changed:', finalIsProcessing);
  }, [finalIsProcessing]);

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
