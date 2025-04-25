
import React from 'react';
import { formatTime } from "../timestamped/timeUtils";

interface SpeakerSegmentProps {
  speaker: string;
  text: string;
  timestamp: number;
  isActive?: boolean;
  onTimestampClick?: () => void;
}

export const SpeakerSegment = ({
  speaker,
  text,
  timestamp,
  isActive = false,
  onTimestampClick
}: SpeakerSegmentProps) => {
  const speakerColor = `hsl(${parseInt(speaker.split('_')[1] || '1') * 60}, 70%, 50%)`;
  
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
          SPEAKER {speaker.split('_')[1] || speaker}
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
