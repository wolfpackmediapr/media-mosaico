import React, { useEffect, useRef, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { TranscriptionResult, UtteranceTimestamp } from "@/services/audio/transcriptionService";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Play, Pause } from "lucide-react";
import SpeakerSegment from "@/components/radio/interactive-transcription/SpeakerSegment";
import SpeakerLegend from "@/components/radio/interactive-transcription/SpeakerLegend";
import { calculateCurrentSegment, normalizeTimeToSeconds } from "@/components/radio/interactive-transcription/utils";

interface TvInteractiveTranscriptionProps {
  transcriptionResult?: TranscriptionResult;
  currentTime: number; // Current video playback position in seconds
  isPlaying: boolean;
  onPlayPause: () => void;
  onSeek: (timestamp: number) => void;
}

const TvInteractiveTranscription: React.FC<TvInteractiveTranscriptionProps> = ({
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
  const videoSeekPending = useRef<boolean>(false);
  const hasUtterances = transcriptionResult?.utterances && transcriptionResult.utterances.length > 0;
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 20 });
  const segmentUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const segmentClickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastCurrentTimeRef = useRef<number>(0);
  const activeSegmentIdRef = useRef<string | null>(null);
  const segmentUpdateRequested = useRef<boolean>(false);
  
  // Debug logging for time updates
  useEffect(() => {
    // Only log significant changes (more than 0.5 second) to reduce noise
    if (Math.abs(currentTime - lastCurrentTimeRef.current) > 0.5) {
      console.log(`[TvInteractiveTranscription] currentTime updated: ${currentTime.toFixed(2)}s (delta: ${(currentTime - lastCurrentTimeRef.current).toFixed(2)}s)`);
      lastCurrentTimeRef.current = currentTime;
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
    };
  }, []);

  // Find the active segment based on current playback time
  const findActiveSegment = useCallback((time: number) => {
    if (!hasUtterances || !transcriptionResult?.utterances) return null;
    
    try {
      const result = calculateCurrentSegment(transcriptionResult.utterances, time);
      if (result) {
        console.log(`[TvInteractiveTranscription] Found active segment: ${result.start}-${result.end} at time ${time.toFixed(2)}s`);
      }
      return result;
    } catch (error) {
      console.error("[TvInteractiveTranscription] Error calculating current segment:", error);
      return null;
    }
  }, [hasUtterances, transcriptionResult?.utterances]);

  // Force update active segment immediately when requested
  useEffect(() => {
    if (segmentUpdateRequested.current) {
      segmentUpdateRequested.current = false;
      
      try {
        if (!hasUtterances || videoSeekPending.current) return;
        
        const active = findActiveSegment(currentTime);
        if (active) {
          const newSegmentId = `segment-${active.start}-${active.end}`;
          if (activeSegmentIdRef.current !== newSegmentId) {
            activeSegmentIdRef.current = newSegmentId;
            setActiveSegmentId(newSegmentId);
            console.log(`[TvInteractiveTranscription] Updated active segment: ${newSegmentId}`);
          }
        } else if (activeSegmentIdRef.current !== null) {
          activeSegmentIdRef.current = null;
          setActiveSegmentId(null);
          console.log(`[TvInteractiveTranscription] Cleared active segment`);
        }
      } catch (error) {
        console.error("[TvInteractiveTranscription] Error in immediate update:", error);
      }
    }
  }, [currentTime, findActiveSegment, hasUtterances]);

  // Update active segment method that runs periodically when playing
  useEffect(() => {
    let updateInterval: NodeJS.Timeout | null = null;
    
    if (isPlaying && hasUtterances) {
      updateInterval = setInterval(() => {
        try {
          if (videoSeekPending.current) return;
          
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
          console.error("[TvInteractiveTranscription] Error in interval update:", error);
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
        !scrollOperationOngoing.current && !videoSeekPending.current) {
      const now = Date.now();
      if (now - lastScrollTime.current > 500) {
        lastScrollTime.current = now;
        scrollOperationOngoing.current = true;
        
        try {
          const behavior = isPlaying ? "auto" : "smooth";
          
          requestAnimationFrame(() => {
            if (activeSegmentRef.current && !videoSeekPending.current) {
              try {
                activeSegmentRef.current.scrollIntoView({
                  behavior,
                  block: "center"
                });
                
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
                
                setTimeout(() => {
                  scrollOperationOngoing.current = false;
                }, 800);
              } catch (scrollError) {
                console.error("[TvInteractiveTranscription] Error during scroll operation:", scrollError);
                scrollOperationOngoing.current = false;
              }
            } else {
              scrollOperationOngoing.current = false;
            }
          });
        } catch (error) {
          console.error("[TvInteractiveTranscription] Error scrolling:", error);
          scrollOperationOngoing.current = false;
        }
      }
    }
  }, [activeSegmentId, isPlaying, transcriptionResult?.utterances]);

  // Handle clicking on a transcript segment
  const handleSegmentClick = useCallback((timestamp: number) => {
    const now = Date.now();
    
    if (now - lastSegmentClickTime.current < 800) {
      console.log(`[TvInteractiveTranscription] Ignoring rapid segment click within cooldown`);
      return;
    }
    
    lastSegmentClickTime.current = now;
    videoSeekPending.current = true;
    
    console.log(`[TvInteractiveTranscription] Segment clicked with raw timestamp: ${timestamp}`);
    
    if (segmentClickTimeoutRef.current) {
      clearTimeout(segmentClickTimeoutRef.current);
    }
    
    try {
      let timeInSeconds: number;
      
      if (timestamp > 1000) {
        timeInSeconds = timestamp / 1000;
        console.log(`[TvInteractiveTranscription] Converting timestamp from ms to seconds: ${timestamp} ms → ${timeInSeconds.toFixed(2)}s`);
      } else {
        timeInSeconds = timestamp;
        console.log(`[TvInteractiveTranscription] Timestamp already in seconds: ${timeInSeconds.toFixed(2)}s`);
      }
      
      if (!isFinite(timeInSeconds) || timeInSeconds < 0) {
        console.error(`[TvInteractiveTranscription] Invalid timestamp: ${timeInSeconds}. Aborting seek.`);
        videoSeekPending.current = false;
        return;
      }
      
      console.log(`[TvInteractiveTranscription] Executing seek to ${timeInSeconds.toFixed(2)}s`);
      onSeek(timeInSeconds);
      
      segmentClickTimeoutRef.current = setTimeout(() => {
        videoSeekPending.current = false;
        segmentClickTimeoutRef.current = null;
        segmentUpdateRequested.current = true;
        console.log(`[TvInteractiveTranscription] Segment click cooldown completed`);
      }, 800);
    } catch (err) {
      console.error("[TvInteractiveTranscription] Error during segment click:", err);
      videoSeekPending.current = false;
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

  const visibleUtterances = transcriptionResult.utterances.slice(
    visibleRange.start,
    visibleRange.end
  );

  return (
    <Card className="overflow-hidden">
      <div className="p-4 bg-muted/30 border-b flex items-center justify-between">
        <h3 className="text-lg font-medium">Transcripción Interactiva TV</h3>
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
          lastScrollTime.current = Date.now() + 2000;
          console.log('[TvInteractiveTranscription] Manual scroll detected - pausing auto-scroll');
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

export default TvInteractiveTranscription;