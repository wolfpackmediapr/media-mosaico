
import React from 'react';
import { formatTime } from "../timestamped/timeUtils";
import { useSpeakerLabels } from "@/hooks/radio/useSpeakerLabels";
import { getSpeakerColor, formatSpeakerName } from "@/components/radio/interactive-transcription/utils";

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
  // Use the same color algorithm as the interactive view so the dot/border
  // colors match across edit and interactive modes — and so they work for
  // BOTH the radio "speaker_1" format and the new TV "A|Name|Role" format.
  const speakerColor = getSpeakerColor(speaker);

  // Get custom user-set speaker label (if any)
  const { getDisplayName } = useSpeakerLabels({ transcriptionId });

  // Resolve display name in this order:
  //   1. User-set custom label (overrides everything)
  //   2. TV piped format "A|Name|Role" → "Name (Role)"
  //   3. Single uppercase letter "A" → "Hablante A"
  //   4. Legacy "speaker_1" → "Hablante 1"
  let displayName: string;
  const customName = transcriptionId ? getDisplayName(speaker) : '';
  const isCustom =
    customName &&
    !customName.startsWith('SPEAKER ') &&
    !customName.startsWith('Hablante ');

  if (isCustom) {
    displayName = customName;
  } else if (typeof speaker === 'string' && speaker.includes('|')) {
    const [, name, role] = speaker.split('|');
    displayName = role ? `${name.trim()} (${role.trim()})` : (name?.trim() || formatSpeakerName(speaker));
  } else {
    displayName = formatSpeakerName(speaker);
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
