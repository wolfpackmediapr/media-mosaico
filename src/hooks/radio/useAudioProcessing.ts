
import { useState, useEffect, useRef } from "react";
import { useAudioPlayer } from "../../components/radio/audio-player/hooks/useAudioPlayer";
import { RadioNewsSegment } from "@/components/radio/RadioNewsSegmentsContainer";
import { toast } from "sonner";

interface AudioFile extends File {
  preview?: string;
  remoteUrl?: string;
  storagePath?: string;
  isUploaded?: boolean;
}

interface AudioProcessingOptions {
  currentFile: AudioFile | null;
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

  const handleAudioError = (error: string) => {
    console.error('[AudioProcessing] Audio error:', error);
    setPlaybackErrors(error);
    
    // Prevent showing multiple error toasts for the same issue
    if (!errorShownRef.current) {
      errorShownRef.current = true;
      // We don't show a toast here as the useAudioPlayer hook already shows one
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
    handlePlayPause: originalHandlePlayPause,
    handleSeek,
    handleSkip,
    handleToggleMute,
    handleVolumeChange,
    handlePlaybackRateChange,
    seekToTimestamp,
    unloadAudio, // Get the unloadAudio method from useAudioPlayer
  } = useAudioPlayer({ 
    file: currentFile || undefined,
    // Add these options to persist audio across tab changes
    preservePlaybackOnBlur: true,
    resumeOnFocus: true,
    onError: handleAudioError
  });

  // Reset error state when file changes
  useEffect(() => {
    if (currentFile) {
      setPlaybackErrors(null);
      errorShownRef.current = false;
      console.log(`[AudioProcessing] New file loaded: ${currentFile.name}`);
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
            if (!playbackErrors) {
              originalHandlePlayPause();
            }
          }, 100);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isPlaying, currentFile, originalHandlePlayPause, playbackErrors]);

  // Sync our playing state with external state
  useEffect(() => {
    // Only update if this is the active media route and the external state has changed
    if (isActiveMediaRoute && externalIsPlaying !== isPlaying) {
      if (externalIsPlaying) {
        // If external state says we should be playing but we're not, try to play
        if (!isPlaying && currentFile && !playbackErrors) {
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
  }, [isActiveMediaRoute, externalIsPlaying, isPlaying, prevPlayingState, currentFile, originalHandlePlayPause, onPlayingChange, playbackErrors]);

  // Wrapper for play/pause that also updates external state
  const handlePlayPause = () => {
    if (playbackErrors) {
      toast.error("Cannot play audio", { 
        description: "Audio file cannot be played due to errors",
        duration: 3000
      });
      return;
    }
    
    originalHandlePlayPause();
    onPlayingChange(!isPlaying);
  };

  // Handler to seek to a specific segment
  const handleSeekToSegment = (segment: RadioNewsSegment) => {
    if (playbackErrors) {
      toast.error("Cannot seek in audio", { 
        description: "Audio file cannot be played due to errors",
        duration: 3000
      });
      return;
    }
    
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
    playbackErrors,
    handlePlayPause,
    handleSeek,
    handleSkip,
    handleToggleMute,
    handleVolumeChange,
    handlePlaybackRateChange,
    handleSeekToSegment,
    unloadAudio, // Export unloadAudio to be used in useRadioPlayer
  };
};
