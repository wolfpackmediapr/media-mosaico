
import { useState, useEffect, useRef } from "react";
import { useAudioPlayer } from "./use-audio-player";
import { RadioNewsSegment } from "@/components/radio/RadioNewsSegmentsContainer";

interface AudioProcessingOptions {
  currentFile: File | null;
  isActiveMediaRoute?: boolean;
  externalIsPlaying?: boolean;
  onPlayingChange?: (isPlaying: boolean) => void;
}

export const useAudioProcessing = ({ 
  currentFile,
  isActiveMediaRoute = true,
  externalIsPlaying = false,
  onPlayingChange = () => {}
}: AudioProcessingOptions) => {
  const [prevPlayingState, setPrevPlayingState] = useState(false);
  const wasPlayingBeforeTabChange = useRef<boolean>(false);
  const lastSeenTabVisible = useRef<number>(Date.now());

  const {
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    playbackRate,
    handlePlayPause: originalHandlePlayPause,
    handleSeek,
    handleSkip,
    handleToggleMute,
    handleVolumeChange,
    handlePlaybackRateChange,
    seekToTimestamp,
  } = useAudioPlayer({ 
    file: currentFile || undefined,
    // Add these options to persist audio across tab changes
    preservePlaybackOnBlur: true,
    resumeOnFocus: true
  });

  // Handle document visibility changes to persist playback across tab changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      const now = Date.now();
      
      if (document.hidden) {
        // Tab is hidden, store current playing state
        wasPlayingBeforeTabChange.current = isPlaying;
        lastSeenTabVisible.current = now;
        console.log("[useAudioProcessing] Tab hidden, saving playback state:", isPlaying);
      } else {
        // Tab is visible again
        console.log("[useAudioProcessing] Tab visible again, previous state:", wasPlayingBeforeTabChange.current);
        console.log("[useAudioProcessing] Time hidden:", Math.round((now - lastSeenTabVisible.current)/1000) + "s");
        
        // If it was playing before tab change, and we've been away for a short time
        // Note: we only auto-resume if we've been away less than 30 minutes
        const wasAwayLessThan30Min = (now - lastSeenTabVisible.current) < 30 * 60 * 1000;
        
        if (wasPlayingBeforeTabChange.current && !isPlaying && currentFile && wasAwayLessThan30Min) {
          console.log("[useAudioProcessing] Resuming playback after tab change");
          // Small delay to ensure audio context is ready
          setTimeout(() => {
            originalHandlePlayPause();
          }, 100);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isPlaying, currentFile, originalHandlePlayPause]);

  // Sync our playing state with external state
  useEffect(() => {
    // Only update if this is the active media route and the external state has changed
    if (isActiveMediaRoute && externalIsPlaying !== isPlaying) {
      if (externalIsPlaying) {
        // If external state says we should be playing but we're not, try to play
        if (!isPlaying && currentFile) {
          originalHandlePlayPause();
        }
      } else {
        // If external state says we should not be playing but we are, pause
        if (isPlaying) {
          originalHandlePlayPause();
        }
      }
    }
    
    // Save previous playing state to detect changes
    if (isPlaying !== prevPlayingState) {
      setPrevPlayingState(isPlaying);
      // Notify parent about playing state changes
      onPlayingChange(isPlaying);
      
      // Update media session state
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
      }
    }
  }, [isActiveMediaRoute, externalIsPlaying, isPlaying, prevPlayingState, currentFile, originalHandlePlayPause, onPlayingChange]);

  // Wrapper for play/pause that also updates external state
  const handlePlayPause = () => {
    originalHandlePlayPause();
    onPlayingChange(!isPlaying);
  };

  // Handler to seek to a specific segment
  const handleSeekToSegment = (segment: RadioNewsSegment) => {
    if (segment && segment.startTime !== undefined) {
      seekToTimestamp(segment.startTime);
      onPlayingChange(true);
    }
  };

  return {
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    playbackRate,
    handlePlayPause,
    handleSeek,
    handleSkip,
    handleToggleMute,
    handleVolumeChange,
    handlePlaybackRateChange,
    handleSeekToSegment,
  };
};
