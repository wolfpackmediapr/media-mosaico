
import React, { useEffect, useRef, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { TranscriptionResult, UtteranceTimestamp } from "@/services/audio/transcriptionService";
import { ScrollArea } from "@/components/ui/scroll-area";
import SpeakerSegment from "./SpeakerSegment";
import SpeakerLegend from "./SpeakerLegend";
import { calculateCurrentSegment, normalizeTimeToSeconds } from "./utils";
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
  const lastCurrentTimeRef = useRef<number>(0);
  const activeSegmentIdRef = useRef<string | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const segmentUpdateRequested = useRef<boolean>(false);
  
  // Debug logging for time updates
  useEffect(() => {
    // Only log significant changes (more than 0.5 second) to reduce noise
    if (Math.abs(currentTime - lastCurrentTimeRef.current) > 0.5) {
      console.log(`[InteractiveTranscription] currentTime updated: ${currentTime.toFixed(2)}s (delta: ${(currentTime - lastCurrentTimeRef.current).toFixed(2)}s)`);
      lastCurrentTimeRef.current = currentTime;
      // Request update on significant change
      segmentUpdateRequested.current = true;
    }
  }, [currentTime]);

  // Clean up timeouts when component unmounts
  useEffect(() => {
    return () => {
      if (segmentUpdateTimeoutRef.current) {
        clearTimeout(segmentUpdateTimeoutRef.current);
        segmentUpdateTimeoutRef.current = null;
      }
      if (segmentClickTimeoutRef.current) {
        clearTimeout(segmentClickTimeoutRef.current);
        segmentClickTimeoutRef.current = null;
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, []);

  // Find the active segment based on current playback time
  const findActiveSegment = useCallback((time: number) => {
    if (!hasUtterances || !transcriptionResult?.utterances) return null;
    
    try {
      const result = calculateCurrentSegment(transcriptionResult.utterances, time);
      if (result) {
        console.log(`[InteractiveTranscription] Found active segment: ${result.start}-${result.end} at time ${time.toFixed(2)}s`);
      }
      return result;
    } catch (error) {
      console.error("[InteractiveTranscription] Error calculating current segment:", error);
      return null;
    }
  }, [hasUtterances, transcriptionResult?.utterances]);

  // Force update active segment immediately when requested
  useEffect(() => {
    if (segmentUpdateRequested.current) {
      segmentUpdateRequested.current = false;
      
      try {
        if (!hasUtterances || audioSeekPending.current) return;
        
        const active = findActiveSegment(currentTime);
        if (active) {
          const newSegmentId = `segment-${active.start}-${active.end}`;
          if (activeSegmentIdRef.current !== newSegmentId) {
            activeSegmentIdRef.current = newSegmentId;
            setActiveSegmentId(newSegmentId);
            console.log(`[InteractiveTranscription] Updated active segment: ${newSegmentId}`);
          }
        } else if (activeSegmentIdRef.current !== null) {
          activeSegmentIdRef.current = null;
          setActiveSegmentId(null);
          console.log(`[InteractiveTranscription] Cleared active segment`);
        }
      } catch (error) {
        console.error("[InteractiveTranscription] Error in immediate update:", error);
      }
    }
  }, [currentTime, findActiveSegment, hasUtterances]);

  // More reliable update active segment method that runs periodically when playing
  useEffect(() => {
    let updateInterval: NodeJS.Timeout | null = null;
    
    if (isPlaying && hasUtterances) {
      updateInterval = setInterval(() => {
        try {
          if (audioSeekPending.current) return;
          
          const active = findActiveSegment(currentTime);
          if (active) {
            const newSegmentId = `segment-${active.start}-${active.end}`;
            if (activeSegmentIdRef.current !== newSegmentId) {
              activeSegmentIdRef.current = newSegmentId;
              setActiveSegmentId(newSegmentId);
            }
          } else if (activeSegmentIdRef.current !== null) {
            activeSegmentIdRef.current = null;
            setActiveSegmentId(null);
          }
        } catch (error) {
          console.error("[InteractiveTranscription] Error in interval update:", error);
        }
      }, 150);
    }
    
    return () => {
      if (updateInterval) {
        clearInterval(updateInterval);
      }
    };
  }, [isPlaying, currentTime, hasUtterances, findActiveSegment]);

  // Update the ref value when state changes
  useEffect(() => {
    activeSegmentIdRef.current = activeSegmentId;
  }, [activeSegmentId]);

  // Auto-scroll to active segment with improved throttling
  useEffect(() => {
    if (activeSegmentId && activeSegmentRef.current && scrollAreaRef.current && 
        !scrollOperationOngoing.current && !audioSeekPending.current) {
      const now = Date.now();
      if (now - lastScrollTime.current > 500) {
        lastScrollTime.current = now;
        scrollOperationOngoing.current = true;
        
        try {
          // Use smooth scrolling only if not playing for better performance
          const behavior = isPlaying ? "auto" : "smooth";
          
          // Wrap in requestAnimationFrame for better timing
          requestAnimationFrame(() => {
            if (activeSegmentRef.current && !audioSeekPending.current) {
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
                
                // Reset scroll operation flag after a delay
                setTimeout(() => {
                  scrollOperationOngoing.current = false;
                }, 800);
              } catch (scrollError) {
                console.error("[InteractiveTranscription] Error during scroll operation:", scrollError);
                scrollOperationOngoing.current = false;
              }
            } else {
              scrollOperationOngoing.current = false;
            }
          });
        } catch (error) {
          // Reset flag if scrolling fails
          console.error("[InteractiveTranscription] Error scrolling:", error);
          scrollOperationOngoing.current = false;
        }
      }
    }
  }, [activeSegmentId, isPlaying, transcriptionResult?.utterances]);

  // Handle clicking on a transcript segment with improved reliability
  const handleSegmentClick = useCallback((timestamp: number) => {
    const now = Date.now();
    
    // Maintain the strict cooldown period for reliability
    if (now - lastSegmentClickTime.current < 800) {
      console.log(`[InteractiveTranscription] Ignoring rapid segment click within cooldown`);
      return;
    }
    
    // Set flags to prevent concurrent operations
    lastSegmentClickTime.current = now;
    audioSeekPending.current = true;
    
    // Always log the raw timestamp we receive to help with debugging
    console.log(`[InteractiveTranscription] Segment clicked with raw timestamp: ${timestamp}`);
    
    // Clear any previous timeout
    if (segmentClickTimeoutRef.current) {
      clearTimeout(segmentClickTimeoutRef.current);
    }
    
    try {
      // IMPROVED: Standardize timestamp format conversion
      // Always ensure we're passing seconds to the audio player
      let timeInSeconds: number;
      
      // Check if timestamp is likely in milliseconds (over 1000)
      if (timestamp > 1000) {
        timeInSeconds = timestamp / 1000;
        console.log(`[InteractiveTranscription] Converting timestamp from ms to seconds: ${timestamp} ms → ${timeInSeconds.toFixed(2)}s`);
      } else {
        // Already in seconds
        timeInSeconds = timestamp;
        console.log(`[InteractiveTranscription] Timestamp already in seconds: ${timeInSeconds.toFixed(2)}s`);
      }
      
      // Validate the timestamp before seeking
      if (!isFinite(timeInSeconds) || timeInSeconds < 0) {
        console.error(`[InteractiveTranscription] Invalid timestamp: ${timeInSeconds}. Aborting seek.`);
        audioSeekPending.current = false;
        return;
      }
      
      console.log(`[InteractiveTranscription] Executing seek to ${timeInSeconds.toFixed(2)}s`);
      onSeek(timeInSeconds);
      
      // Clear the pending flag after a delay to allow time for the player to update
      segmentClickTimeoutRef.current = setTimeout(() => {
        audioSeekPending.current = false;
        segmentClickTimeoutRef.current = null;
        
        // Force update of active segment after seeking
        segmentUpdateRequested.current = true;
        console.log(`[InteractiveTranscription] Segment click cooldown completed`);
      }, 800);
    } catch (err) {
      console.error("[InteractiveTranscription] Error during segment click:", err);
      audioSeekPending.current = false;
    }
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
          // IMPROVED: Extend cooldown period after manual scroll
          // Update the last scroll time to prevent auto-scrolling right after manual scroll
          lastScrollTime.current = Date.now() + 2000; // 2 second penalty after manual scroll
          console.log('[InteractiveTranscription] Manual scroll detected - pausing auto-scroll');
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
