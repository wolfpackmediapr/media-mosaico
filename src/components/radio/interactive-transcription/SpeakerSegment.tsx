
import React from "react";
import { UtteranceTimestamp } from "@/services/audio/transcriptionService";
import { formatTime } from "@/components/radio/timestamped/timeUtils";
import { getSpeakerColor } from "./utils";

interface SpeakerSegmentProps {
  utterance: UtteranceTimestamp;
  isActive: boolean;
  onClick: () => void;
  refProp?: React.RefObject<HTMLDivElement>;
}

const SpeakerSegment: React.FC<SpeakerSegmentProps> = ({
  utterance,
  isActive,
  onClick,
  refProp,
}) => {
  const speakerColor = getSpeakerColor(utterance.speaker);
  
  return (
    <div
      ref={refProp}
      onClick={onClick}
      className={`
        p-3 rounded-lg transition-all cursor-pointer
        hover:bg-muted/50
        ${isActive ? 'bg-muted ring-2 ring-primary ring-offset-2' : 'bg-card border'}
      `}
      data-speaker={utterance.speaker}
      data-start={utterance.start}
      data-end={utterance.end}
    >
      <div className="flex items-center gap-2 mb-1">
        <div 
          className="w-4 h-4 rounded-full"
          style={{ backgroundColor: speakerColor }}
        />
        <span className="font-medium text-sm">
          {typeof utterance.speaker === 'string' ? 
            utterance.speaker.includes('_') ? 
              `Speaker ${utterance.speaker.split('_')[1]}` : 
              `Speaker ${utterance.speaker}`
            : `Speaker ${utterance.speaker}`}
        </span>
        <span className="text-xs text-muted-foreground ml-auto">
          {formatTime(utterance.start, false)}
        </span>
      </div>
      
      <p 
        className={`text-base leading-relaxed ${isActive ? 'font-medium' : ''}`}
        style={{ 
          borderLeftColor: speakerColor,
          borderLeftWidth: '2px',
          paddingLeft: '0.75rem'
        }}
      >
        {utterance.text}
      </p>
    </div>
  );
};

export default SpeakerSegment;
