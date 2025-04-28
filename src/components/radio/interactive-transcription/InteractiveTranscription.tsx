
import React, { useEffect, useRef, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { TranscriptionResult, UtteranceTimestamp } from "@/services/audio/transcriptionService";
import { ScrollArea } from "@/components/ui/scroll-area";
import SpeakerSegment from "./SpeakerSegment";
import SpeakerLegend from "./SpeakerLegend";
import { calculateCurrentSegment } from "./utils";
import { Button } from "@/components/ui/button";
import { Play, Pause } from "lucide-react";

interface InteractiveTranscriptionProps {
  transcriptionResult?: TranscriptionResult;
  currentTime: number; // Current audio playback position in seconds
  isPlaying: boolean;
  onPlayPause: () => void;
  onSeek: (timestamp: number) => void;
}

const InteractiveTranscription: React.FC<InteractiveTranscriptionProps> = ({
  transcriptionResult,
  currentTime,
  isPlaying,
  onPlayPause,
  onSeek,
}) => {
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const activeSegmentRef = useRef<HTMLDivElement>(null);
  const lastScrollTime = useRef<number>(0);
  const lastSegmentClickTime = useRef<number>(0);
  const hasUtterances = transcriptionResult?.utterances && transcriptionResult.utterances.length > 0;
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 20 });

  // Find the active segment based on current playback time with debouncing
  const findActiveSegment = useCallback((time: number) => {
    if (!hasUtterances || !transcriptionResult?.utterances) return null;
    
    return calculateCurrentSegment(transcriptionResult.utterances, time);
  }, [hasUtterances, transcriptionResult?.utterances]);

  // Update active segment with debouncing to reduce state updates
  useEffect(() => {
    if (!hasUtterances) return;
    
    // Use a simple debounce by checking every 300ms instead of every frame
    const updateInterval = setInterval(() => {
      const active = findActiveSegment(currentTime);
      if (active) {
        const newSegmentId = `segment-${active.start}-${active.end}`;
        if (activeSegmentId !== newSegmentId) {
          setActiveSegmentId(newSegmentId);
        }
      } else if (activeSegmentId !== null) {
        setActiveSegmentId(null);
      }
    }, 300);
    
    return () => clearInterval(updateInterval);
  }, [currentTime, findActiveSegment, hasUtterances, activeSegmentId]);

  // Auto-scroll to active segment with throttling to improve performance
  useEffect(() => {
    if (activeSegmentId && activeSegmentRef.current && scrollAreaRef.current) {
      // Throttle scrolling to improve performance
      const now = Date.now();
      if (now - lastScrollTime.current > 800) { // Only scroll every 800ms at most (increased from 500ms)
        lastScrollTime.current = now;
        
        // Use smooth scrolling if not playing or slow scrolling if playing
        const behavior = isPlaying ? "smooth" : "auto";
        
        activeSegmentRef.current.scrollIntoView({
          behavior,
          block: "center"
        });
        
        // Update visible range based on active segment
        if (transcriptionResult?.utterances) {
          const activeIndex = transcriptionResult.utterances.findIndex(
            u => `segment-${u.start}-${u.end}` === activeSegmentId
          );
          
          if (activeIndex !== -1) {
            const start = Math.max(0, activeIndex - 5);
            const end = Math.min(transcriptionResult.utterances.length, activeIndex + 15);
            setVisibleRange({ start, end });
          }
        }
      }
    }
  }, [activeSegmentId, isPlaying, transcriptionResult?.utterances]);

  // Handle clicking on a transcript segment with debouncing
  const handleSegmentClick = useCallback((timestamp: number) => {
    const now = Date.now();
    
    // Prevent rapid successive clicks (300ms cooldown)
    if (now - lastSegmentClickTime.current < 300) {
      console.log(`[InteractiveTranscription] Ignoring rapid segment click`);
      return;
    }
    
    lastSegmentClickTime.current = now;
    console.log(`[InteractiveTranscription] Segment clicked at ${timestamp}s`);
    
    // Add a small delay before seeking to prevent conflicts with other operations
    setTimeout(() => onSeek(timestamp), 50);
  }, [onSeek]);

  if (!hasUtterances || !transcriptionResult?.utterances) {
    return (
      <Card className="p-4 text-center">
        <p className="text-muted-foreground">
          No hay datos de speaker disponibles para esta transcripción.
        </p>
      </Card>
    );
  }

  // Optimize rendering by only showing segments in the visible range
  const visibleUtterances = transcriptionResult.utterances.slice(
    visibleRange.start,
    visibleRange.end
  );

  return (
    <Card className="overflow-hidden">
      <div className="p-4 bg-muted/30 border-b flex items-center justify-between">
        <h3 className="text-lg font-medium">Transcripción Interactiva</h3>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onPlayPause}
            className="flex items-center gap-1"
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {isPlaying ? "Pausar" : "Reproducir"}
          </Button>
          <SpeakerLegend utterances={transcriptionResult.utterances} />
        </div>
      </div>

      <ScrollArea 
        className="h-[400px] p-4" 
        ref={scrollAreaRef}
        onScrollCapture={() => {
          // Update the last scroll time to prevent auto-scrolling right after manual scroll
          // Extend the cooldown period to 2 seconds after manual scroll
          lastScrollTime.current = Date.now() + 2000;
        }}
      >
        <div className="space-y-4">
          {visibleRange.start > 0 && (
            <div className="text-center text-sm text-muted-foreground py-2">
              • • •
            </div>
          )}
          
          {visibleUtterances.map((utterance) => {
            const segmentId = `segment-${utterance.start}-${utterance.end}`;
            const isActive = activeSegmentId === segmentId;
            
            return (
              <SpeakerSegment
                key={segmentId}
                utterance={utterance}
                isActive={isActive}
                refProp={isActive ? activeSegmentRef : undefined}
                onClick={() => handleSegmentClick(utterance.start)}
              />
            );
          })}
          
          {visibleRange.end < transcriptionResult.utterances.length && (
            <div className="text-center text-sm text-muted-foreground py-2">
              • • •
            </div>
          )}
        </div>
      </ScrollArea>
    </Card>
  );
};

export default InteractiveTranscription;
