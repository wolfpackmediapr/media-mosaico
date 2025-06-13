
import React from "react";
import TvTranscriptionSection from "../TvTranscriptionSection";
import { TranscriptionResult } from "@/services/audio/transcriptionService";
import { NewsSegment } from "@/hooks/tv/useTvVideoProcessor";

interface TvTranscriptionManagerProps {
  textContent: string;
  isProcessing: boolean;
  transcriptionMetadata?: {
    channel?: string;
    program?: string;
    category?: string;
    broadcastTime?: string;
  };
  transcriptionResult?: TranscriptionResult;
  transcriptionId?: string;
  onTranscriptionChange: (text: string) => void;
  onSeekToTimestamp: (timestamp: number) => void;
  onSegmentsReceived?: (segments: NewsSegment[]) => void;
  registerEditorReset?: (fn: () => void) => void;
  isPlaying?: boolean;
  currentTime?: number;
  onPlayPause?: () => void;
}

const TvTranscriptionManager = (props: TvTranscriptionManagerProps) => {
  return <TvTranscriptionSection {...props} />;
};

export default TvTranscriptionManager;
