
import React from "react";
import RadioTranscriptionSlot from "../RadioTranscriptionSlot";
import { TranscriptionResult } from "@/services/audio/transcriptionService";
import { RadioNewsSegment } from "../RadioNewsSegmentsContainer";

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
      onSeek={(time) => {
        if (typeof time === 'number') {
          // Create a temporary segment object for the timestamp
          const tempSegment: RadioNewsSegment = {
            headline: "Timestamp",
            text: "",
            startTime: time,
            end: time + 1000,
            keywords: []
          };
          handleSeekToSegment(tempSegment);
        } else {
          handleSeekToSegment(time);
        }
      }}
    />
  );
};

export default TranscriptionSection;
