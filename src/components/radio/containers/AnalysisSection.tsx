
import React, { useEffect } from "react";
import RadioAnalysis from "../RadioAnalysis";
import { TranscriptionResult } from "@/services/audio/transcriptionService";
import { RadioNewsSegment } from "../RadioNewsSegmentsContainer";

interface AnalysisSectionProps {
  transcriptionText: string;
  transcriptionId?: string;
  transcriptionResult?: TranscriptionResult;
  handleSegmentsReceived: (segments: RadioNewsSegment[]) => void;
  onClearAnalysis: (clearFn: () => void) => void;
  lastAction?: string | null; // Add lastAction prop
}

const AnalysisSection = ({
  transcriptionText,
  transcriptionId,
  transcriptionResult,
  handleSegmentsReceived,
  onClearAnalysis,
  lastAction
}: AnalysisSectionProps) => {
  // Force clear when lastAction is 'clear'
  useEffect(() => {
    if (lastAction === 'clear') {
      console.log('[AnalysisSection] Detected clear action, ensuring analysis is reset');
    }
  }, [lastAction]);

  return (
    <RadioAnalysis 
      transcriptionText={transcriptionText} 
      transcriptionId={transcriptionId}
      transcriptionResult={transcriptionResult}
      onSegmentsGenerated={handleSegmentsReceived}
      onClearAnalysis={onClearAnalysis}
      forceReset={lastAction === 'clear'} // Pass flag to force reset
    />
  );
};

export default AnalysisSection;
