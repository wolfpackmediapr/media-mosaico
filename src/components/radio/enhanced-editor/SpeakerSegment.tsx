
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
  // Extract just the number for color calculation
  const speakerNum = typeof speaker === 'string' && speaker.includes('_') 
    ? speaker.split('_')[1] 
    : speaker;
  const speakerColor = `hsl(${parseInt(String(speakerNum)) * 60}, 70%, 50%)`;
  
  // Get custom speaker name if transcriptionId is available
  const { getDisplayName } = useSpeakerLabels({ transcriptionId });
  
  // For display: Use custom name if set, otherwise just "SPEAKER X"
  // Gemini names are now in the text content as prefixes
  let displayName: string;
  if (transcriptionId) {
    const customName = getDisplayName(speaker);
    // If user has set a custom name (not default), use it
    if (customName && !customName.startsWith('SPEAKER ')) {
      displayName = customName;
    } else {
      displayName = `SPEAKER ${speakerNum}`;
    }
  } else {
    displayName = `SPEAKER ${speakerNum}`;
  }
  
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
