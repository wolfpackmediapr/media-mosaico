
import React from "react";
import { TranscriptionResult } from "@/services/audio/transcriptionService";
import { useTranscriptionEditor } from "@/hooks/radio/useTranscriptionEditor";
import { Textarea } from "@/components/ui/textarea";
import TranscriptionFeedback from "./editor/TranscriptionFeedback";

/**
 * This editor always shows/edit speaker-labeled format if utterances are present,
 * otherwise falls back to plain text editing. No view toggle: always display SPEAKER X blocks if possible.
 */
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
}: RadioTranscriptionEditorProps) => {
  const {
    localText,
    isEditing,
    isLoadingUtterances,
    isSaving,
    handleTextChange,
    toggleEditMode,
    hasSpeakerLabels,
  } = useTranscriptionEditor({
    transcriptionText,
    transcriptionId,
    transcriptionResult,
    onTranscriptionChange,
  });

  // Always show the editable textarea with speaker-labeled text if available.
  return (
    <div className="relative">
      <Textarea
        placeholder={
          hasSpeakerLabels
            ? "SPEAKER 1: Aquí aparecerá la transcripción con etiquetas de hablante editables..."
            : "Aquí aparecerá el texto transcrito..."
        }
        className={`min-h-[200px] resize-y pr-12 border-primary focus:border-primary focus-visible:ring-1`}
        value={localText}
        onChange={handleTextChange}
        readOnly={isProcessing}
        onClick={!isEditing ? toggleEditMode : undefined}
        spellCheck={true}
        autoCorrect="on"
        autoComplete="off"
      />
      {/* Mini status, feedback, etc */}
      <div className="absolute top-2 right-2 flex flex-col gap-2">
        {isSaving && (
          <span className="text-sm text-primary animate-pulse">
            Guardando...
          </span>
        )}
        {isLoadingUtterances && (
          <span className="text-xs text-muted-foreground">Cargando hablantes...</span>
        )}
      </div>
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
