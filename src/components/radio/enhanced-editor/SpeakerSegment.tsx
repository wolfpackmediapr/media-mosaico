
import React from 'react';
import { formatTime } from "../timestamped/timeUtils";
import { useSpeakerLabels } from "@/hooks/radio/useSpeakerLabels";

interface SpeakerSegmentProps {
  speaker: string;
  text: string;
  timestamp: number;
  isActive?: boolean;
  onTimestampClick?: () => void;
  transcriptionId?: string;
}

export const SpeakerSegment = ({
  speaker,
  text,
  timestamp,
  isActive = false,
  onTimestampClick,
  transcriptionId
}: SpeakerSegmentProps) => {
  const speakerColor = `hsl(${parseInt(speaker.split('_')[1] || '1') * 60}, 70%, 50%)`;
  
  // Get custom speaker name if transcriptionId is available
  const { getDisplayName } = useSpeakerLabels({ transcriptionId });
  
  // Use custom name if available, otherwise fallback to default format
  const displayName = transcriptionId ? getDisplayName(speaker) : `SPEAKER ${speaker.split('_')[1] || speaker}`;
  
  return (
    <div 
      className={`
        p-4 rounded-lg mb-4 transition-all
        ${isActive ? 'bg-muted/50 ring-2 ring-primary' : 'hover:bg-muted/30'}
      `}
    >
      <div className="flex items-center gap-2 mb-2">
        <div 
          className="w-3 h-3 rounded-full" 
          style={{ backgroundColor: speakerColor }}
        />
        <span className="font-medium">
          {displayName}
        </span>
        <button
          onClick={onTimestampClick}
          className="ml-auto text-sm text-muted-foreground hover:text-primary"
        >
          [{formatTime(timestamp)}]
        </button>
      </div>
      <p 
        className="pl-4 border-l-2 text-base leading-relaxed"
        style={{ borderColor: speakerColor }}
      >
        {text}
      </p>
    </div>
  );
};
