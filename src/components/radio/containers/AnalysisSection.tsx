
import React from "react";
import RadioAnalysis from "../RadioAnalysis";
import { TranscriptionResult } from "@/services/audio/transcriptionService";
import { RadioNewsSegment } from "../RadioNewsSegmentsContainer";

interface AnalysisSectionProps {
  transcriptionText: string;
  transcriptionId?: string;
  transcriptionResult?: TranscriptionResult;
  handleSegmentsReceived: (segments: RadioNewsSegment[]) => void;
  onClearAnalysis: (clearFn: () => void) => void;
}

const AnalysisSection = ({
  transcriptionText,
  transcriptionId,
  transcriptionResult,
  handleSegmentsReceived,
  onClearAnalysis
}: AnalysisSectionProps) => (
  <RadioAnalysis 
    transcriptionText={transcriptionText} 
    transcriptionId={transcriptionId}
    transcriptionResult={transcriptionResult}
    onSegmentsGenerated={handleSegmentsReceived}
    onClearAnalysis={onClearAnalysis}
  />
);

export default AnalysisSection;
