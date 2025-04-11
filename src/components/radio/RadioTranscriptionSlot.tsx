
import { Card, CardContent } from "@/components/ui/card";
import { useEffect } from "react";
import RadioTranscriptionMetadata from "./RadioTranscriptionMetadata";
import RadioTranscriptionEditor from "./RadioTranscriptionEditor";
import RadioAnalysis from "./RadioAnalysis";
import { RadioNewsSegment } from "./RadioNewsSegmentsContainer";
import RadioReportButton from "./RadioReportButton";
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
}

const RadioTranscriptionSlot = ({
  isProcessing,
  transcriptionText,
  transcriptionResult,
  transcriptionId,
  metadata,
  onTranscriptionChange,
  onSegmentsReceived,
  onMetadataChange
}: RadioTranscriptionSlotProps) => {
  const { checkAndGenerateSegments } = useRadioSegmentGenerator(onSegmentsReceived);

  // Check for segment generation when transcription changes
  useEffect(() => {
    // If we have a full result object, use it for better timestamp accuracy
    if (transcriptionResult) {
      checkAndGenerateSegments(transcriptionResult);
    } else {
      // Fallback to just text-based segmentation
      checkAndGenerateSegments(transcriptionText);
    }
  }, [transcriptionText, transcriptionResult, checkAndGenerateSegments]);

  return (
    <div className="space-y-4 md:space-y-6 h-full w-full">
      <Card className="overflow-hidden w-full">
        <RadioTranscriptionMetadata metadata={metadata} onMetadataChange={onMetadataChange} />
        <CardContent className="p-4 space-y-4">
          <RadioTranscriptionEditor
            transcriptionText={transcriptionText}
            isProcessing={isProcessing}
            onTranscriptionChange={onTranscriptionChange}
            transcriptionId={transcriptionId}
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

      <RadioAnalysis 
        transcriptionText={transcriptionText} 
        transcriptionResult={transcriptionResult}
        onSegmentsGenerated={onSegmentsReceived}
      />
    </div>
  );
};

export default RadioTranscriptionSlot;
