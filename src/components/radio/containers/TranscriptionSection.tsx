
import React from "react";
import RadioTranscriptionSlot from "../RadioTranscriptionSlot";
import { TranscriptionResult } from "@/services/audio/transcriptionService";
import { RadioNewsSegment } from "../RadioNewsSegmentsContainer";
import { normalizeTimeToSeconds } from "../interactive-transcription/utils";

interface TranscriptionSectionProps {
  isProcessing: boolean;
  transcriptionText: string;
  transcriptionId?: string;
  transcriptionResult?: TranscriptionResult;
  metadata?: {
    emisora?: string;
    programa?: string;
    horario?: string;
    categoria?: string;
    station_id?: string;
    program_id?: string;
  };
  handleTranscriptionTextChange: (text: string) => void;
  handleSegmentsReceived: (segments: RadioNewsSegment[]) => void;
  handleMetadataChange: (metadata: {
    emisora: string;
    programa: string;
    horario: string;
    categoria: string;
    station_id: string;
    program_id: string;
  }) => void;
  handleSeekToSegment: (segment: RadioNewsSegment) => void;
  registerEditorReset: (resetFn: () => void) => void;
  isPlaying: boolean;
  currentTime: number;
  onPlayPause: () => void;
}

const TranscriptionSection = ({
  isProcessing,
  transcriptionText,
  transcriptionId,
  transcriptionResult,
  metadata,
  handleTranscriptionTextChange,
  handleSegmentsReceived,
  handleMetadataChange,
  handleSeekToSegment,
  registerEditorReset,
  isPlaying,
  currentTime,
  onPlayPause,
}: TranscriptionSectionProps) => {
  // Handle both time values and segment objects consistently
  const handleSeekOperation = (timeOrSegment: number | RadioNewsSegment) => {
    console.log(`[TranscriptionSection] Seeking to:`, timeOrSegment);
    
    if (typeof timeOrSegment === 'number') {
      // Create a temporary segment object for the timestamp
      const timeInSeconds = normalizeTimeToSeconds(timeOrSegment);
      console.log(`[TranscriptionSection] Creating temp segment with normalized time: ${timeInSeconds}s`);
      
      const tempSegment: RadioNewsSegment = {
        headline: "Timestamp",
        text: "",
        startTime: timeInSeconds * 1000,
        end: timeInSeconds * 1000 + 1000,
        keywords: []
      };
      handleSeekToSegment(tempSegment);
    } else {
      // We already have a segment object
      handleSeekToSegment(timeOrSegment);
    }
  };

  // Handle timestamp clicks (number) separately from segment handling
  const handleTimestampClick = (timestamp: number) => {
    const timeInSeconds = normalizeTimeToSeconds(timestamp);
    const tempSegment: RadioNewsSegment = {
      headline: "Timestamp",
      text: "",
      startTime: timeInSeconds * 1000,
      end: timeInSeconds * 1000 + 1000,
      keywords: []
    };
    handleSeekToSegment(tempSegment);
  };

  return (
    <RadioTranscriptionSlot
      isProcessing={isProcessing}
      transcriptionText={transcriptionText}
      transcriptionResult={transcriptionResult}
      transcriptionId={transcriptionId}
      metadata={metadata}
      onTranscriptionChange={handleTranscriptionTextChange}
      onSegmentsReceived={handleSegmentsReceived}
      onMetadataChange={handleMetadataChange}
      onTimestampClick={handleTimestampClick}
      registerEditorReset={registerEditorReset}
      isPlaying={isPlaying}
      currentTime={currentTime}
      onPlayPause={onPlayPause}
      onSeek={handleSeekOperation}
    />
  );
};

export default TranscriptionSection;
