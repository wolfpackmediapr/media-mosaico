import React from "react";
import { SaveStatus } from "./SaveStatus";
import { TranscriptionFeedback } from "./TranscriptionFeedback";
import { TranscriptionResult } from "@/services/audio/transcriptionService";
import EditorWrapper from "./EditorWrapper";
import { useEnhancedEditorState } from "@/hooks/radio/editor/useEnhancedEditorState";

interface TranscriptionEditorWrapperProps {
  transcriptionResult?: TranscriptionResult;
  transcriptionText: string;
  isProcessing: boolean;
  onTranscriptionChange: (text: string) => void;
  onTimestampClick?: (timestamp: number) => void;
  currentTime?: number;
  isSaving: boolean;
  hasSpeakerLabels: boolean;
  saveError?: string | null;
  saveSuccess?: boolean;
  isEditing?: boolean;
  transcriptionId?: string;
}

export const TranscriptionEditorWrapper = ({
  transcriptionResult,
  transcriptionText,
  isProcessing,
  onTranscriptionChange,
  onTimestampClick,
  currentTime,
  isSaving,
  hasSpeakerLabels,
  saveError,
  saveSuccess,
  transcriptionId
}: TranscriptionEditorWrapperProps) => {
  // Use our enhanced editor state hook
  const {
    localText,
    isEditing,
    showTimestamps,
    hasTimestampData,
    handleTextChange,
    toggleTimestampView,
    toggleEditMode
  } = useEnhancedEditorState({
    transcriptionText,
    transcriptionId,
    transcriptionResult,
    onTranscriptionChange
  });

  return (
    <div className="relative">
      <EditorWrapper
        text={localText}
        isProcessing={isProcessing}
        isEditing={isEditing}
        showTimestamps={showTimestamps}
        hasTimestampData={hasSpeakerLabels}
        isSaving={isSaving}
        transcriptionResult={transcriptionResult}
        onTextChange={handleTextChange}
        toggleTimestampView={toggleTimestampView}
        toggleEditMode={toggleEditMode}
        onTimestampClick={onTimestampClick}
      />
      
      <SaveStatus 
        isSaving={isSaving} 
        saveError={saveError}
        saveSuccess={saveSuccess}
      />
      
      <TranscriptionFeedback
        isEmpty={!localText}
        isProcessing={isProcessing}
        showTimestamps={!!hasSpeakerLabels}
        hasTimestampData={!!hasSpeakerLabels}
      />
    </div>
  );
};

// Keep backward compatibility with the original TranscriptionEditorWrapper
export default TranscriptionEditorWrapper;
