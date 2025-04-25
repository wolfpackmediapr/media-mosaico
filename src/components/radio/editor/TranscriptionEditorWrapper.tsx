
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
      />
      <SaveStatus isSaving={isSaving} />
      <TranscriptionFeedback
        isEmpty={!transcriptionText}
        isProcessing={isProcessing}
        showTimestamps={!!hasSpeakerLabels}
        hasTimestampData={!!hasSpeakerLabels}
      />
    </div>
  );
};
