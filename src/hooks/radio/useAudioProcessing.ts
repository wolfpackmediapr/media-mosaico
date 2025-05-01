
import { useState, useEffect, useRef, useCallback } from "react";
import { useAudioPlayer } from "../../components/radio/audio-player/hooks/useAudioPlayer";
import { RadioNewsSegment } from "@/components/radio/RadioNewsSegmentsContainer";
import { useAudioErrorHandling } from "./processing/useAudioErrorHandling";
import { useAudioUnlock } from "./processing/useAudioUnlock";
import { useExternalAudioSync } from "./processing/useExternalAudioSync";
import { useAudioVisibilitySync } from "./processing/useAudioVisibilitySync";
import { useAudioPlaybackControl } from "./processing/useAudioPlaybackControl";

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
  const isLoadingAudio = useRef<boolean>(false);
  
  // Use the audio unlock hook
  const { attemptAudioUnlock } = useAudioUnlock();

  // Core audio player functionality
  const {
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    playbackRate,
    playbackErrors,
    isLoading,
    isReady,
    isUsingNativeAudio = false,
    switchToNativeAudio = () => {},
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
    onError: (error) => setPlaybackErrors(error)
  });

  // Handle audio errors
  const { playbackErrors: processedPlaybackErrors, setPlaybackErrors } = useAudioErrorHandling({
    currentFile,
    playerAudioError: playbackErrors?.howlerError || null,
    onClearError: () => console.log("[useAudioProcessing] Error cleared"),
    onSwitchToNative: switchToNativeAudio
  });

  // Track audio loading state
  useEffect(() => {
    isLoadingAudio.current = isLoading || false;
  }, [isLoading]);

  // Sync with external play/pause commands
  useExternalAudioSync({
    isActiveMediaRoute,
    externalIsPlaying,
    internalIsPlaying: isPlaying,
    isLoading,
    isReady,
    currentFile,
    playbackErrors: processedPlaybackErrors,
    triggerPlay: originalHandlePlayPause,
    triggerPause: originalHandlePlayPause,
    onInternalPlayStateChange: (isPlaying) => {
      onPlayingChange(isPlaying);
    }
  });

  // Handle tab visibility changes
  useAudioVisibilitySync({
    isPlaying,
    isLoading,
    isReady,
    currentFile,
    playbackErrors: processedPlaybackErrors,
    triggerPlay: originalHandlePlayPause,
    triggerPause: originalHandlePlayPause
  });
  
  // Use the new playback control hook
  const {
    handlePlayPause,
    handleSeekToSegment,
    cleanupPendingOperations
  } = useAudioPlaybackControl({
    isPlaying,
    playbackErrors: processedPlaybackErrors,
    originalHandlePlayPause,
    seekToTimestamp: handleSeek,
    onPlayingChange
  });

  // Sync our playing state with external state
  useEffect(() => {
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
  }, [isPlaying, prevPlayingState, onPlayingChange]);

  // Cleanup effect on unmount
  useEffect(() => {
    return () => {
      cleanupPendingOperations();
    };
  }, [cleanupPendingOperations]);

  return {
    isPlaying,
    currentTime,
    duration,
    volume, // This will be an array from useAudioPlayer
    isMuted,
    playbackRate,
    playbackErrors: processedPlaybackErrors,
    isUsingNativeAudio,
    switchToNativeAudio,
    handlePlayPause,
    handleSeek,
    handleSkip,
    handleToggleMute,
    handleVolumeChange,
    handlePlaybackRateChange,
    handleSeekToSegment,
  };
};
