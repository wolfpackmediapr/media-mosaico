
import React, { useEffect } from "react";
import TvAnalysis from "./TvAnalysis";
import { TranscriptionResult } from "@/services/audio/transcriptionService";
import { NewsSegment } from "@/hooks/use-video-processor";

interface TvAnalysisSectionProps {
  transcriptionText: string;
  transcriptionId?: string;
  transcriptionResult?: TranscriptionResult;
  testAnalysis?: any;
  onClearAnalysis?: (clearFn: () => void) => void;
  lastAction?: string | null;
  onSegmentsGenerated?: (segments: NewsSegment[]) => void;
}

const TvAnalysisSection = ({
  transcriptionText,
  transcriptionId,
  transcriptionResult,
  testAnalysis,
  onClearAnalysis,
  lastAction,
  onSegmentsGenerated
}: TvAnalysisSectionProps) => {
  // Force clear when lastAction is 'clear'
  useEffect(() => {
    if (lastAction === 'clear') {
      console.log('[TvAnalysisSection] Detected clear action, ensuring analysis is reset');
    }
  }, [lastAction]);

  // Don't show analysis if no transcription text or if cleared
  if (!transcriptionText || lastAction === 'clear') {
    return null;
  }

  return (
    <TvAnalysis 
      transcriptionText={transcriptionText} 
      transcriptionId={transcriptionId}
      transcriptionResult={transcriptionResult}
      onSegmentsGenerated={onSegmentsGenerated}
      onClearAnalysis={onClearAnalysis}
      forceReset={lastAction === 'clear'}
    />
  );
};

export default TvAnalysisSection;
