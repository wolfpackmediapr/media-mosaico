
import { EnhancedTranscriptionEditor } from "../enhanced-editor/EnhancedTranscriptionEditor";
import { SaveStatus } from "./SaveStatus";
import { TranscriptionFeedback } from "./TranscriptionFeedback";
import { TranscriptionResult } from "@/services/audio/transcriptionService";

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
  showPlaceholder?: boolean;
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
  isEditing,
  showPlaceholder,
  transcriptionId,
}: TranscriptionEditorWrapperProps) => {
  return (
    <div className="relative">
      <EnhancedTranscriptionEditor
        transcriptionResult={transcriptionResult}
        transcriptionText={transcriptionText}
        isProcessing={isProcessing}
        onTranscriptionChange={onTranscriptionChange}
        onTimestampClick={onTimestampClick}
        currentTime={currentTime}
        transcriptionId={transcriptionId}
      />
      <SaveStatus 
        isSaving={isSaving} 
        saveError={saveError}
        saveSuccess={saveSuccess}
      />
      <TranscriptionFeedback
        isEmpty={!transcriptionText}
        isProcessing={isProcessing}
        showTimestamps={!!hasSpeakerLabels}
        hasTimestampData={!!hasSpeakerLabels}
      />
    </div>
  );
};
