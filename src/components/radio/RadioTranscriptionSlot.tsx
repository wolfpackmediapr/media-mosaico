
import { Card, CardContent } from "@/components/ui/card";
import { useEffect } from "react";
import RadioTranscriptionMetadata from "./RadioTranscriptionMetadata";
import RadioTranscriptionEditor from "./RadioTranscriptionEditor";
import RadioReportButton from "./RadioReportButton";
import { RadioNewsSegment } from "./RadioNewsSegmentsContainer";
import { useRadioSegmentGenerator } from "@/hooks/radio/useRadioSegmentGenerator";
import { TranscriptionResult } from "@/services/audio/transcriptionService";

interface RadioTranscriptionSlotProps {
  isProcessing: boolean;
  transcriptionText: string;
  transcriptionResult?: TranscriptionResult;
  transcriptionId?: string;
  metadata?: {
    emisora?: string;
    programa?: string;
    horario?: string;
    categoria?: string;
    station_id?: string;
    program_id?: string;
  };
  onTranscriptionChange: (text: string) => void;
  onSegmentsReceived?: (segments: RadioNewsSegment[]) => void;
  onMetadataChange?: (metadata: {
    emisora: string;
    programa: string;
    horario: string;
    categoria: string;
    station_id: string;
    program_id: string;
  }) => void;
  onTimestampClick?: (timestamp: number) => void;
  // Add prop to allow parent to get access to the editor's reset method
  registerEditorReset?: (fn: () => void) => void;
}

const RadioTranscriptionSlot = ({
  isProcessing,
  transcriptionText,
  transcriptionResult,
  transcriptionId,
  metadata,
  onTranscriptionChange,
  onSegmentsReceived,
  onMetadataChange,
  onTimestampClick,
  registerEditorReset,
}: RadioTranscriptionSlotProps) => {
  const { checkAndGenerateSegments } = useRadioSegmentGenerator(onSegmentsReceived);
  // Check for segment generation when transcription changes
  useEffect(() => {
    if (transcriptionResult) {
      checkAndGenerateSegments(transcriptionResult);
    } else {
      checkAndGenerateSegments(transcriptionText);
    }
  }, [transcriptionText, transcriptionResult, checkAndGenerateSegments]);

  // Provide the editor's reset function upwards if registerEditorReset is used.
  const editorRef = useRef<{ resetLocalSpeakerText?: () => void }>(null);

  useEffect(() => {
    if (registerEditorReset && editorRef.current?.resetLocalSpeakerText) {
      registerEditorReset(editorRef.current.resetLocalSpeakerText);
    }
  }, [registerEditorReset]);

  return (
    <div className="space-y-4 md:space-y-6 w-full">
      <Card className="overflow-hidden w-full">
        <RadioTranscriptionMetadata metadata={metadata} onMetadataChange={onMetadataChange} />
        <CardContent className="p-4 space-y-4">
          <RadioTranscriptionEditor
            ref={editorRef}
            transcriptionText={transcriptionText}
            isProcessing={isProcessing}
            onTranscriptionChange={onTranscriptionChange}
            transcriptionId={transcriptionId}
            transcriptionResult={transcriptionResult}
            onTimestampClick={onTimestampClick}
          />
          <div className="flex justify-end">
            <RadioReportButton
              transcriptionText={transcriptionText}
              metadata={metadata}
              isProcessing={isProcessing}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RadioTranscriptionSlot;
