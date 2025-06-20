
import React, { useMemo } from "react";
import { TranscriptionResult } from "@/services/audio/transcriptionService";
import SpeakerSegment from "./SpeakerSegment";

interface InteractiveTranscriptionProps {
  transcriptionResult?: TranscriptionResult;
  currentTime?: number;
  isPlaying?: boolean;
  onPlayPause?: () => void;
  onSeek?: (time: number) => void;
  transcriptionId?: string;
}

const InteractiveTranscription: React.FC<InteractiveTranscriptionProps> = ({
  transcriptionResult,
  currentTime = 0,
  isPlaying = false,
  onPlayPause = () => {},
  onSeek = () => {},
  transcriptionId,
}) => {
  const utterances = transcriptionResult?.utterances || [];

  // Generate unique speakers list
  const speakers = useMemo(() => {
    const uniqueSpeakers = new Set<string>();
    utterances.forEach(utterance => {
      if (utterance.speaker) {
        uniqueSpeakers.add(utterance.speaker.toString());
      }
    });
    return Array.from(uniqueSpeakers).sort();
  }, [utterances]);

  // Color mapping for speakers
  const speakerColors = useMemo(() => {
    const colors = [
      '#3B82F6', '#EF4444', '#10B981', '#F59E0B', 
      '#8B5CF6', '#F97316', '#06B6D4', '#84CC16'
    ];
    const colorMap: Record<string, string> = {};
    speakers.forEach((speaker, index) => {
      colorMap[speaker] = colors[index % colors.length];
    });
    return colorMap;
  }, [speakers]);

  const getSpeakerColor = (speaker: string) => {
    return speakerColors[speaker] || '#6B7280';
  };

  // Find current segment based on time
  const currentSegmentIndex = useMemo(() => {
    const currentTimeMs = currentTime * 1000;
    return utterances.findIndex(utterance => {
      const start = utterance.start || 0;
      const end = utterance.end || 0;
      return currentTimeMs >= start && currentTimeMs <= end;
    });
  }, [utterances, currentTime]);

  if (!transcriptionResult || utterances.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No speaker-separated transcription available.</p>
        <p className="text-sm mt-1">Upload an audio file with multiple speakers to see interactive transcription.</p>
      </div>
    );
  }

  return (
    <div className="max-h-96 overflow-y-auto space-y-3">
      {utterances.map((utterance, index) => (
        <SpeakerSegment
          key={index}
          speaker={utterance.speaker?.toString() || 'Unknown'}
          text={utterance.text}
          startTime={utterance.start || 0}
          endTime={utterance.end || 0}
          isCurrentSegment={index === currentSegmentIndex}
          isPlaying={isPlaying}
          onSeek={onSeek}
          onPlayPause={onPlayPause}
          getSpeakerColor={getSpeakerColor}
          transcriptionId={transcriptionId}
        />
      ))}
    </div>
  );
};

export default InteractiveTranscription;
