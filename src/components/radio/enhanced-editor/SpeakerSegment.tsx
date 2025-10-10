
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
  
  // Extract Gemini-detected name if present: "speaker_2_(María Rivera)"
  const geminiNameMatch = speaker.match(/_\(([^)]+)\)$/);
  const geminiName = geminiNameMatch ? geminiNameMatch[1] : null;
  const speakerNum = speaker.split('_')[1]?.split('(')[0] || speaker;
  
  // Get custom speaker name if transcriptionId is available
  const { getDisplayName } = useSpeakerLabels({ transcriptionId });
  
  // Priority: Custom name > Gemini name > Default "SPEAKER X"
  let displayName: string;
  if (transcriptionId) {
    const customName = getDisplayName(speaker);
    // If user has set a custom name (not just "SPEAKER X"), use it
    if (customName && !customName.startsWith('SPEAKER ')) {
      displayName = customName;
    } else if (geminiName) {
      // Use Gemini-detected name
      displayName = `SPEAKER ${speakerNum} (${geminiName})`;
    } else {
      displayName = `SPEAKER ${speakerNum}`;
    }
  } else if (geminiName) {
    displayName = `SPEAKER ${speakerNum} (${geminiName})`;
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
