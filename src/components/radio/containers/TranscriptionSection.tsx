
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
  // IMPROVED: Handle both time values and segment objects consistently
  const handleSeekOperation = (timeOrSegment: number | RadioNewsSegment) => {
    console.log(`[TranscriptionSection] Seeking to:`, timeOrSegment);
    
    if (typeof timeOrSegment === 'number') {
      // Create a temporary segment object for the timestamp
      // Make sure we're using a consistent format for the segment
      const timeInSeconds = normalizeTimeToSeconds(timeOrSegment);
      console.log(`[TranscriptionSection] Creating temp segment with normalized time: ${timeInSeconds}s`);
      
      const tempSegment: RadioNewsSegment = {
        headline: "Timestamp",
        text: "",
        // Use milliseconds for startTime as that's what the RadioNewsSegment expects
        startTime: timeInSeconds * 1000,
        end: timeInSeconds * 1000 + 1000,
        keywords: []
      };
      handleSeekToSegment(tempSegment);
    } else {
      // We already have a segment object
      // Make sure the startTime is properly formatted if needed
      const segment = { ...timeOrSegment };
      handleSeekToSegment(segment);
    }
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
      onTimestampClick={handleSeekToSegment}
      registerEditorReset={registerEditorReset}
      isPlaying={isPlaying}
      currentTime={currentTime}
      onPlayPause={onPlayPause}
      onSeek={handleSeekOperation}
    />
  );
};

export default TranscriptionSection;
