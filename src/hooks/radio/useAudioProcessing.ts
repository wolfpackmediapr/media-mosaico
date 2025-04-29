
import { useState, useEffect, useRef } from "react";
import { useAudioPlayer } from "../../components/radio/audio-player/hooks/useAudioPlayer";
import { RadioNewsSegment } from "@/components/radio/RadioNewsSegmentsContainer";
import { toast } from "sonner";
import { getAudioFormatDetails } from "@/utils/audio-format-helper";

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
  const [playbackErrors, setPlaybackErrors] = useState<string | null>(null);
  const wasPlayingBeforeTabChange = useRef<boolean>(false);
  const lastSeenTabVisible = useRef<number>(Date.now());
  const errorShownRef = useRef<boolean>(false);
  const lastErrorTime = useRef<number>(0);
  const resumeAttemptCountRef = useRef<number>(0);
  const isLoadingAudio = useRef<boolean>(false);
  const wasAudioLoadingOnHide = useRef<boolean>(false);

  const handleAudioError = (error: string) => {
    const now = Date.now();
    console.error('[AudioProcessing] Audio error:', error);
    
    // Store the error
    setPlaybackErrors(error);
    
    // Don't show too many error toasts for the same issue (throttle to once per 10 seconds)
    if (!errorShownRef.current || (now - lastErrorTime.current > 10000)) {
      errorShownRef.current = true;
      lastErrorTime.current = now;
      
      // Only show one toast with more helpful info
      if (currentFile) {
        const details = getAudioFormatDetails(currentFile);
        console.log(`[AudioProcessing] File details: ${details}`);
      }
      
      // We don't show an additional toast here as the useAudioPlayer hook already shows one
    }
  };

  const {
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    playbackRate,
    audioError,
    isLoading,
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
    resumeOnFocus: true,
    onError: handleAudioError
  });

  // Track audio loading state
  useEffect(() => {
    isLoadingAudio.current = isLoading || false;
  }, [isLoading]);

  // Reset error state when file changes
  useEffect(() => {
    if (currentFile) {
      setPlaybackErrors(null);
      errorShownRef.current = false;
      resumeAttemptCountRef.current = 0;
      console.log(`[AudioProcessing] New file loaded: ${currentFile.name} (${currentFile.type})`);
      
      // Log format details for debugging
      const details = getAudioFormatDetails(currentFile);
      console.log(`[AudioProcessing] File details: ${details}`);
    }
  }, [currentFile]);

  // Sync with audioError from useAudioPlayer
  useEffect(() => {
    if (audioError) {
      setPlaybackErrors(audioError);
    }
  }, [audioError]);

  // Handle document visibility changes to persist playback across tab changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      const now = Date.now();
      
      if (document.hidden) {
        // Tab is hidden, store current playing state
        wasPlayingBeforeTabChange.current = isPlaying;
        wasAudioLoadingOnHide.current = isLoadingAudio.current;
        lastSeenTabVisible.current = now;
        console.log("[useAudioProcessing] Tab hidden, saving playback state:", isPlaying, "loading:", isLoadingAudio.current);
      } else {
        // Tab is visible again
        const timeHiddenSeconds = Math.round((now - lastSeenTabVisible.current)/1000);
        console.log("[useAudioProcessing] Tab visible again, previous state:", wasPlayingBeforeTabChange.current);
        console.log("[useAudioProcessing] Time hidden:", timeHiddenSeconds + "s", "was loading:", wasAudioLoadingOnHide.current);
        
        // If it was playing before tab change, and we've been away for a short time
        // Note: we only auto-resume if we've been away less than 30 minutes
        const wasAwayLessThan30Min = (now - lastSeenTabVisible.current) < 30 * 60 * 1000;
        const shouldTryResume = wasPlayingBeforeTabChange.current && !isPlaying && 
                               currentFile && wasAwayLessThan30Min &&
                               resumeAttemptCountRef.current < 3; // Limit resume attempts to 3
        
        if (shouldTryResume) {
          console.log("[useAudioProcessing] Attempting to resume playback after tab change");
          // Longer delay to ensure audio context is fully ready
          resumeAttemptCountRef.current += 1;
          
          setTimeout(() => {
            try {
              if (!playbackErrors) {
                console.log("[useAudioProcessing] Executing delayed play after tab visibility change");
                originalHandlePlayPause();
              }
            } catch (e) {
              console.error("[useAudioProcessing] Error resuming playback:", e);
            }
          }, 500);
        } else if (resumeAttemptCountRef.current >= 3) {
          console.log("[useAudioProcessing] Max resume attempts reached, not trying again");
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isPlaying, currentFile, originalHandlePlayPause, playbackErrors, isLoading]);

  // Sync our playing state with external state
  useEffect(() => {
    // Only update if this is the active media route and the external state has changed
    if (isActiveMediaRoute && externalIsPlaying !== isPlaying) {
      if (externalIsPlaying) {
        // If external state says we should be playing but we're not, try to play
        if (!isPlaying && currentFile && !playbackErrors && !isLoadingAudio.current) {
          try {
            originalHandlePlayPause();
          } catch (err) {
            console.error("[useAudioProcessing] Error during external play command:", err);
          }
        }
      } else {
        // If external state says we should not be playing but we are, pause
        if (isPlaying) {
          try {
            originalHandlePlayPause();
          } catch (err) {
            console.error("[useAudioProcessing] Error during external pause command:", err);
          }
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
        try {
          navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
        } catch (e) {
          console.warn("[useAudioProcessing] Error updating media session state:", e);
        }
      }
    }
  }, [isActiveMediaRoute, externalIsPlaying, isPlaying, prevPlayingState, currentFile, originalHandlePlayPause, onPlayingChange, playbackErrors]);

  // Enhanced error handling - attempt recovery for certain errors
  useEffect(() => {
    if (playbackErrors && playbackErrors.includes("AbortError") && currentFile) {
      console.log("[useAudioProcessing] Detected AbortError, attempting recovery");
      
      // Clear error after short delay to allow retry
      const recoveryTimer = setTimeout(() => {
        setPlaybackErrors(null);
        errorShownRef.current = false;
        console.log("[useAudioProcessing] Cleared error state to allow retry");
      }, 3000);
      
      return () => clearTimeout(recoveryTimer);
    }
  }, [playbackErrors, currentFile]);

  // Wrapper for play/pause that also updates external state and handles errors
  const handlePlayPause = () => {
    if (playbackErrors) {
      toast.error("No se puede reproducir el audio", { 
        description: "El archivo de audio no se puede reproducir debido a errores",
        duration: 3000
      });
      return;
    }
    
    try {
      originalHandlePlayPause();
      onPlayingChange(!isPlaying);
    } catch (err) {
      console.error("[useAudioProcessing] Error in handlePlayPause:", err);
      toast.error("Error al controlar la reproducción", { 
        duration: 3000
      });
    }
  };

  // Enhanced handler to seek to a specific segment with better error handling
  const handleSeekToSegment = (segment: RadioNewsSegment) => {
    if (playbackErrors) {
      toast.error("No se puede buscar en el audio", { 
        description: "El archivo de audio no se puede reproducir debido a errores",
        duration: 3000
      });
      return;
    }
    
    if (segment && segment.startTime !== undefined) {
      console.log(`[useAudioProcessing] Seeking to segment at ${segment.startTime}s`);
      try {
        // Add a small delay before seeking to avoid potential race conditions
        setTimeout(() => {
          try {
            seekToTimestamp(segment.startTime);
            
            // Set playing state after a small delay to ensure seek completes first
            setTimeout(() => onPlayingChange(true), 100);
          } catch (innerErr) {
            console.error("[useAudioProcessing] Error in delayed seek:", innerErr);
          }
        }, 50);
      } catch (err) {
        console.error("[useAudioProcessing] Error in handleSeekToSegment:", err);
      }
    }
  };

  return {
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    playbackRate,
    playbackErrors,
    handlePlayPause,
    handleSeek,
    handleSkip,
    handleToggleMute,
    handleVolumeChange,
    handlePlaybackRateChange,
    handleSeekToSegment,
  };
};
