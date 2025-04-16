
import React, { useEffect } from "react";
import { TranscriptionResult } from "@/services/audio/transcriptionService";
import { useTranscriptionEditor } from "@/hooks/radio/useTranscriptionEditor";
import EditorContent from "./editor/EditorContent";
import EditorControls from "./editor/EditorControls";
import TranscriptionFeedback from "./editor/TranscriptionFeedback";

interface RadioTranscriptionEditorProps {
  transcriptionText: string;
  isProcessing: boolean;
  onTranscriptionChange: (text: string) => void;
  transcriptionId?: string;
  transcriptionResult?: TranscriptionResult;
  onTimestampClick?: (timestamp: number) => void;
}

const RadioTranscriptionEditor = ({
  transcriptionText,
  isProcessing,
  onTranscriptionChange,
  transcriptionId,
  transcriptionResult,
  onTimestampClick = () => {}
}: RadioTranscriptionEditorProps) => {
  const {
    localText,
    isEditing,
    showTimestamps,
    hasTimestampData,
    enhancedTranscriptionResult,
    isLoadingUtterances,
    isSaving,
    handleTextChange,
    toggleEditMode,
    toggleTimestampView,
  } = useTranscriptionEditor({
    transcriptionText,
    transcriptionId,
    transcriptionResult,
    onTranscriptionChange,
  });

  return (
    <div className="relative">
      <EditorContent 
        showTimestamps={showTimestamps}
        hasTimestampData={hasTimestampData}
        isEditing={isEditing}
        isProcessing={isProcessing}
        isLoadingUtterances={isLoadingUtterances}
        text={localText}
        transcriptionResult={enhancedTranscriptionResult}
        onTextChange={handleTextChange}
        onTimestampClick={onTimestampClick}
        onTextAreaClick={() => !isEditing && toggleEditMode()}
      />
      
      <EditorControls 
        showTimestamps={showTimestamps}
        isEditing={isEditing}
        hasTimestampData={hasTimestampData}
        isProcessing={isProcessing}
        isSaving={isSaving}
        toggleTimestampView={toggleTimestampView}
        toggleEditMode={toggleEditMode}
        text={localText}
      />
      
      <TranscriptionFeedback
        isEmpty={!localText}
        isProcessing={isProcessing}
        showTimestamps={showTimestamps}
        hasTimestampData={hasTimestampData}
      />
    </div>
  );
};

export default RadioTranscriptionEditor;
