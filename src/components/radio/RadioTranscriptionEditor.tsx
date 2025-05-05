
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

  // Track if component is mounted to avoid state updates after unmount
  const isMountedRef = useRef<boolean>(true);
  
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Register the reset function if the prop is provided
  useEffect(() => {
    if (registerReset && resetLocalSpeakerText) {
      registerReset(resetLocalSpeakerText);
      return () => {
        if (isMountedRef.current && registerReset) {
          registerReset(() => {});
        }
      };
    }
  }, [registerReset, resetLocalSpeakerText]);

  // Calculate the final processing state with more granular logging
  const finalIsProcessing = isProcessing || isLoadingUtterances;
  console.log('[RadioTranscriptionEditor] Processing state details:', {
    isProcessing,
    isLoadingUtterances,
    finalIsProcessing,
    hasTranscriptionText: !!transcriptionText,
    hasTranscriptionResult: !!transcriptionResult,
    hasEnhancedResult: !!enhancedTranscriptionResult,
    currentTime: currentTime?.toFixed(2) || 'none'
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
      onTranscriptionChange={handleTextChange}
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
