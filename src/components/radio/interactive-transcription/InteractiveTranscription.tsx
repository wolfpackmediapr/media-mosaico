
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
  const scrollOperationOngoing = useRef<boolean>(false);
  const audioSeekPending = useRef<boolean>(false);
  const hasUtterances = transcriptionResult?.utterances && transcriptionResult.utterances.length > 0;
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 20 });
  const segmentUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const segmentClickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up timeouts when component unmounts
  useEffect(() => {
    return () => {
      if (segmentUpdateTimeoutRef.current) {
        clearTimeout(segmentUpdateTimeoutRef.current);
      }
      if (segmentClickTimeoutRef.current) {
        clearTimeout(segmentClickTimeoutRef.current);
      }
    };
  }, []);

  // Find the active segment based on current playback time with debouncing
  const findActiveSegment = useCallback((time: number) => {
    if (!hasUtterances || !transcriptionResult?.utterances) return null;
    
    try {
      return calculateCurrentSegment(transcriptionResult.utterances, time);
    } catch (error) {
      console.error("[InteractiveTranscription] Error calculating current segment:", error);
      return null;
    }
  }, [hasUtterances, transcriptionResult?.utterances]);

  // Update active segment with improved debouncing to reduce state updates
  useEffect(() => {
    if (!hasUtterances) return;
    
    // Only update if we're not in the middle of a user-initiated seek
    if (audioSeekPending.current) {
      return;
    }
    
    // Clear any existing timeout to prevent rapid updates
    if (segmentUpdateTimeoutRef.current) {
      clearTimeout(segmentUpdateTimeoutRef.current);
    }
    
    // Use a debouncing mechanism with a longer interval (800ms)
    segmentUpdateTimeoutRef.current = setTimeout(() => {
      try {
        const active = findActiveSegment(currentTime);
        if (active) {
          const newSegmentId = `segment-${active.start}-${active.end}`;
          if (activeSegmentId !== newSegmentId) {
            setActiveSegmentId(newSegmentId);
          }
        } else if (activeSegmentId !== null) {
          setActiveSegmentId(null);
        }
      } catch (error) {
        console.error("[InteractiveTranscription] Error updating active segment:", error);
      }
      
      segmentUpdateTimeoutRef.current = null;
    }, 800);
    
    return () => {
      if (segmentUpdateTimeoutRef.current) {
        clearTimeout(segmentUpdateTimeoutRef.current);
      }
    };
  }, [currentTime, findActiveSegment, hasUtterances, activeSegmentId]);

  // Auto-scroll to active segment with improved throttling
  useEffect(() => {
    if (activeSegmentId && activeSegmentRef.current && scrollAreaRef.current && !scrollOperationOngoing.current && !audioSeekPending.current) {
      // Throttle scrolling more aggressively to improve performance
      const now = Date.now();
      if (now - lastScrollTime.current > 1500) { // Increased from 1200ms to 1500ms
        lastScrollTime.current = now;
        scrollOperationOngoing.current = true;
        
        try {
          // Use smooth scrolling only if not playing for better performance
          const behavior = isPlaying ? "auto" : "smooth";
          
          // Wrap in setTimeout to ensure DOM is ready
          setTimeout(() => {
            if (activeSegmentRef.current) {
              try {
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
              } catch (scrollError) {
                console.error("[InteractiveTranscription] Error during scroll operation:", scrollError);
              }
              
              // Reset scroll operation flag after a delay
              setTimeout(() => {
                scrollOperationOngoing.current = false;
              }, 300);
            }
          }, 100);
        } catch (error) {
          // Reset flag if scrolling fails
          console.error("[InteractiveTranscription] Error scrolling:", error);
          scrollOperationOngoing.current = false;
        }
      }
    }
  }, [activeSegmentId, isPlaying, transcriptionResult?.utterances]);

  // Handle clicking on a transcript segment with improved debouncing
  const handleSegmentClick = useCallback((timestamp: number) => {
    const now = Date.now();
    
    // Increased cooldown period to 800ms
    if (now - lastSegmentClickTime.current < 800) {
      console.log(`[InteractiveTranscription] Ignoring rapid segment click within 800ms cooldown`);
      return;
    }
    
    lastSegmentClickTime.current = now;
    console.log(`[InteractiveTranscription] Segment clicked at ${timestamp}s`);
    audioSeekPending.current = true;
    
    // Clear any previous timeout
    if (segmentClickTimeoutRef.current) {
      clearTimeout(segmentClickTimeoutRef.current);
    }
    
    // Increased delay before seeking to better prevent conflicts
    segmentClickTimeoutRef.current = setTimeout(() => {
      try {
        onSeek(timestamp);
      } catch (error) {
        console.error("[InteractiveTranscription] Error during seek operation:", error);
      }
      
      // Reset seek pending flag after a delay
      setTimeout(() => {
        audioSeekPending.current = false;
      }, 1000);
      
      segmentClickTimeoutRef.current = null;
    }, 300);
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
          // Extend the cooldown period to 5 seconds after manual scroll (from 3 seconds)
          lastScrollTime.current = Date.now() + 5000;
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
