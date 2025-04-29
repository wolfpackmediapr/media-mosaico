
import React, { memo, useRef } from "react";
import { UtteranceTimestamp } from "@/services/audio/transcriptionService";
import { formatTime } from "@/components/radio/timestamped/timeUtils";
import { getSpeakerColor } from "./utils";

interface SpeakerSegmentProps {
  utterance: UtteranceTimestamp;
  isActive: boolean;
  onClick: () => void;
  refProp?: React.RefObject<HTMLDivElement>;
}

// Using React.memo to prevent unnecessary re-renders
const SpeakerSegment = memo<SpeakerSegmentProps>(({
  utterance,
  isActive,
  onClick,
  refProp,
}) => {
  const speakerColor = getSpeakerColor(utterance.speaker);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isClickingRef = useRef<boolean>(false);
  const lastClickTimeRef = useRef<number>(0);
  
  // Enhanced click handling with better debouncing
  const handleClick = () => {
    const now = Date.now();
    
    // Add minimum time between clicks (300ms)
    if (now - lastClickTimeRef.current < 300) {
      return;
    }
    
    lastClickTimeRef.current = now;
    
    if (isClickingRef.current) {
      // Prevent duplicate clicks
      return;
    }
    
    isClickingRef.current = true;
    
    // Clear any existing timeout
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
    }
    
    // Set a timeout for the click to prevent rapid succession
    // Increased delay to 100ms for better stability
    clickTimeoutRef.current = setTimeout(() => {
      onClick();
      
      // Reset clicking state after a small additional delay
      // to ensure we don't trigger multiple rapid clicks
      setTimeout(() => {
        isClickingRef.current = false;
      }, 100);
    }, 100);
  };
  
  return (
    <div
      ref={refProp}
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
});

SpeakerSegment.displayName = 'SpeakerSegment';

export default SpeakerSegment;
