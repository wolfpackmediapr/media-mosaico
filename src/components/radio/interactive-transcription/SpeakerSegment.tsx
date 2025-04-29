
import React, { memo, useRef, useEffect } from "react";
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
  
  // Clear any pending timeouts when unmounting
  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = null;
      }
    };
  }, []);
  
  // Enhanced click handling with better debouncing and safety checks
  const handleClick = () => {
    const now = Date.now();
    
    // Increased minimum time between clicks from 300ms to 500ms for better stability
    if (now - lastClickTimeRef.current < 500) {
      console.log("[SpeakerSegment] Click ignored, too soon after previous click");
      return;
    }
    
    lastClickTimeRef.current = now;
    
    if (isClickingRef.current) {
      console.log("[SpeakerSegment] Click ignored, still processing previous click");
      return;
    }
    
    isClickingRef.current = true;
    
    // Clear any existing timeout
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
    }
    
    // Increased delay to 200ms for better stability
    clickTimeoutRef.current = setTimeout(() => {
      try {
        onClick();
      } catch (err) {
        console.error("[SpeakerSegment] Error in click handler:", err);
      }
      
      // Reset clicking state after a longer delay (200ms)
      setTimeout(() => {
        isClickingRef.current = false;
      }, 200);
    }, 200);
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
