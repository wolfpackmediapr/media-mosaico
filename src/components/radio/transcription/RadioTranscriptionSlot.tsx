
import { Card, CardContent } from "@/components/ui/card";
import { useState } from "react";
import RadioTranscriptionMetadata from "../RadioTranscriptionMetadata";
import RadioTranscriptionEditor from "../RadioTranscriptionEditor";
import RadioAnalysis from "../RadioAnalysis";
import { RadioNewsSegment } from "../RadioNewsSegmentsContainer";
import RadioReportButton from "./RadioReportButton";
import RadioTranscriptionGenerator from "./RadioTranscriptionGenerator";

interface RadioTranscriptionSlotProps {
  isProcessing: boolean;
  transcriptionText: string;
  transcriptionId?: string;
  metadata?: {
    emisora?: string;
    programa?: string;
    horario?: string;
    categoria?: string;
  };
  onTranscriptionChange: (text: string) => void;
  onSegmentsReceived?: (segments: RadioNewsSegment[]) => void;
  onMetadataChange?: (metadata: {
    emisora: string;
    programa: string;
    horario: string;
    categoria: string;
  }) => void;
}

const RadioTranscriptionSlot = ({
  isProcessing,
  transcriptionText,
  transcriptionId,
  metadata,
  onTranscriptionChange,
  onSegmentsReceived,
  onMetadataChange
}: RadioTranscriptionSlotProps) => {
  return (
    <div className="space-y-4 md:space-y-6 h-full w-full">
      <Card className="overflow-hidden w-full">
        <RadioTranscriptionMetadata 
          metadata={metadata} 
          onMetadataChange={onMetadataChange} 
        />
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
              isProcessing={isProcessing}
              metadata={metadata}
            />
          </div>
        </CardContent>
      </Card>

      {/* Invisible component that handles segment generation */}
      <RadioTranscriptionGenerator
        transcriptionText={transcriptionText}
        onSegmentsReceived={onSegmentsReceived}
      />

      <RadioAnalysis 
        transcriptionText={transcriptionText} 
        onSegmentsGenerated={onSegmentsReceived}
      />
    </div>
  );
};

export default RadioTranscriptionSlot;
