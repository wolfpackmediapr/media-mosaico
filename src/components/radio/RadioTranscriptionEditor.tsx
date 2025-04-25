
import React from "react";
import { TranscriptionResult } from "@/services/audio/transcriptionService";
import { useTranscriptionEditor } from "@/hooks/radio/useTranscriptionEditor";
import TranscriptionFeedback from "./editor/TranscriptionFeedback";
import { EnhancedTranscriptionEditor } from "./enhanced-editor/EnhancedTranscriptionEditor";

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

  return (
    <div className="relative">
      <EnhancedTranscriptionEditor
        transcriptionResult={transcriptionResult}
        transcriptionText={localText}
        isProcessing={isProcessing}
        onTranscriptionChange={handleTextChange}
        onTimestampClick={onTimestampClick}
        currentTime={currentTime}
      />
      {isSaving && (
        <div className="absolute top-2 right-2">
          <span className="text-sm text-primary animate-pulse">
            Guardando...
          </span>
        </div>
      )}
      <TranscriptionFeedback
        isEmpty={!localText}
        isProcessing={isProcessing}
        showTimestamps={!!hasSpeakerLabels}
        hasTimestampData={!!hasSpeakerLabels}
      />
    </div>
  );
};

export default RadioTranscriptionEditor;
