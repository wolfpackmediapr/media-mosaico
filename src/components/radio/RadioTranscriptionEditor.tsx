
import React, { useEffect, useRef, useCallback } from "react";
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
  
  // Track last props for debugging
  const lastPropsRef = useRef({
    transcriptionText,
    currentTime,
    isProcessing
  });
  
  // Track the last timestamp click time to prevent duplicate clicks
  const lastTimestampClickTimeRef = useRef<number>(0);
  
  // Enhanced timestamp click handler with debouncing
  const handleTimestampClick = useCallback((timestamp: number) => {
    if (!onTimestampClick) return;
    
    // Debounce timestamp clicks to prevent rapid multiple clicks
    const now = Date.now();
    if (now - lastTimestampClickTimeRef.current < 200) {
      console.log('[RadioTranscriptionEditor] Ignoring rapid timestamp click');
      return;
    }
    
    lastTimestampClickTimeRef.current = now;
    console.log(`[RadioTranscriptionEditor] Timestamp clicked: ${timestamp.toFixed(2)}s`);
    onTimestampClick(timestamp);
  }, [onTimestampClick]);
  
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

  // Debug changes in props for synchronization issues
  useEffect(() => {
    const propsChanged = {
      text: transcriptionText !== lastPropsRef.current.transcriptionText,
      time: currentTime !== lastPropsRef.current.currentTime,
      processing: isProcessing !== lastPropsRef.current.isProcessing
    };
    
    if (propsChanged.text || propsChanged.time || propsChanged.processing) {
      console.log('[RadioTranscriptionEditor] Props changed:', propsChanged, {
        currentTime: currentTime?.toFixed(2) || 'none',
        prevTime: lastPropsRef.current.currentTime?.toFixed(2) || 'none'
      });
      lastPropsRef.current = {
        transcriptionText,
        currentTime,
        isProcessing
      };
    }
  }, [transcriptionText, currentTime, isProcessing]);

  // Calculate the final processing state with more granular logging
  const finalIsProcessing = isProcessing || isLoadingUtterances;
  
  // Only log significant changes to reduce noise
  useEffect(() => {
    if (finalIsProcessing) {
      console.log('[RadioTranscriptionEditor] Processing state started');
    } else {
      console.log('[RadioTranscriptionEditor] Processing state ended');
    }
  }, [finalIsProcessing]);

  return (
    <TranscriptionEditorWrapper
      transcriptionResult={enhancedTranscriptionResult || transcriptionResult}
      transcriptionText={localText || transcriptionText}
      isProcessing={finalIsProcessing}
      onTranscriptionChange={handleTextChange}
      onTimestampClick={handleTimestampClick}
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
