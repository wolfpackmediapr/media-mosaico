
import React, { memo, useRef, forwardRef } from "react";
import { UtteranceTimestamp } from "@/services/audio/transcriptionService";
import { formatTime } from "@/components/radio/timestamped/timeUtils";
import { getSpeakerColor } from "./utils";
import { useSpeakerLabels } from "@/hooks/radio/useSpeakerLabels";

interface SpeakerSegmentProps {
  utterance: UtteranceTimestamp;
  isActive: boolean;
  onClick: () => void;
  refProp?: React.RefObject<HTMLDivElement>;
  transcriptionId?: string;
}

const SpeakerSegment = memo(forwardRef<HTMLDivElement, SpeakerSegmentProps>(({
  utterance,
  isActive,
  onClick,
  refProp,
  transcriptionId,
}, forwardedRef) => {
  const speakerColor = getSpeakerColor(utterance.speaker);
  const localRef = useRef<HTMLDivElement>(null);
  
  // Use forwarded ref if available, otherwise use refProp, otherwise use local ref
  const segmentRef = forwardedRef || refProp || localRef;
  
  // Get custom speaker name
  const { getDisplayName } = useSpeakerLabels({ transcriptionId });
  
  // Enhanced click handler with debouncing
  const handleClick = () => {
    // Prevent click spamming
    const currentRef = typeof segmentRef === 'function' ? null : segmentRef?.current;
    if (!currentRef) {
      onClick();
      return;
    }
    
    // Apply visual feedback
    currentRef.classList.add('opacity-80');
    
    // Execute the click after a short delay to prevent double triggering
    setTimeout(() => {
      onClick();
      if (currentRef) {
        currentRef.classList.remove('opacity-80');
      }
    }, 150);
  };

  // Get display speaker name (with custom name if available)
  const displaySpeaker = getDisplayName(String(utterance.speaker));
  
  return (
    <div
      ref={segmentRef}
      onClick={handleClick}
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
        <span className="font-medium text-sm">{displaySpeaker}</span>
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
}));

SpeakerSegment.displayName = 'SpeakerSegment';

export default SpeakerSegment;
