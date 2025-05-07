
import { useEffect, useRef } from "react";
import { useHowlerPlayer } from "@/hooks/radio/audio-player/hooks/useHowlerPlayer";
import { useAudioVisibilitySync } from "./processing/useAudioVisibilitySync";
import { useAudioPlaybackControl } from "./processing/useAudioPlaybackControl";
import { useAudioErrorHandling } from "./processing/useAudioErrorHandling";
import { useExternalAudioSync } from "./processing/useExternalAudioSync";
import { useAudioUnlock } from "./processing/useAudioUnlock";
import { UploadedFile } from "@/components/radio/types";
import { ensureUiVolumeFormat } from "@/utils/audio-volume-adapter";

interface AudioProcessingOptions {
  currentFile: UploadedFile | null;
  isActiveMediaRoute?: boolean;
  externalIsPlaying?: boolean;
  onPlayingChange?: (isPlaying: boolean) => void;
  preferNativeAudio?: boolean; // Option to control native audio preference
}

export const useAudioProcessing = ({
  currentFile,
  isActiveMediaRoute = true,
  externalIsPlaying = false,
  onPlayingChange = () => {},
  preferNativeAudio = true // Default to using native audio first
}: AudioProcessingOptions) => {
  // Track previous error messages to avoid repeated logs
  const previousErrorRef = useRef<string | null>(null);
  
  // Initialize Howler player with preferNative option
  const {
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    playbackRate,
    playbackErrors: rawPlaybackErrors,
    isLoading,
    isReady,
    isUsingNativeAudio,
    handlePlayPause: originalHandlePlayPause,
    handleSeek,
    handleSkip,
    handleToggleMute,
    handleVolumeChange: originalHandleVolumeChange,
    handlePlaybackRateChange,
    setIsPlaying,
    seekToTimestamp,
    switchToNativeAudio,
    switchToHowler,
  } = useHowlerPlayer({
    file: currentFile,
    onPlayingChange,
    preferNative: preferNativeAudio
  });

  // Enhanced volume change handler with additional validation
  const handleVolumeChange = (newVolume: number[]) => {
    // Validate volume before passing it to the player
    if (!Array.isArray(newVolume) || newVolume.length === 0 || !isFinite(newVolume[0])) {
      console.warn('[useAudioProcessing] Received invalid volume, using default', newVolume);
      originalHandleVolumeChange([50]); // Default fallback
      return;
    }
    
    // Ensure values are in valid range
    const safeVolume = newVolume.map(v => 
      isFinite(v) ? Math.max(0, Math.min(100, v)) : 50
    );
    
    originalHandleVolumeChange(safeVolume);
  };

  // Convert complex error object to string for simpler handling
  const playbackErrors = rawPlaybackErrors ?
    (typeof rawPlaybackErrors === 'string' ?
      rawPlaybackErrors :
      "Unknown error") : null;

  // Handle audio state sync with other tabs
  useAudioVisibilitySync({
    isPlaying,
    isLoading,
    isReady,
    currentFile,
    playbackErrors,
    triggerPlay: () => setIsPlaying(true),
    triggerPause: () => setIsPlaying(false)
  });

  // Sync with external playing state (like media session)
  useExternalAudioSync({
    isActiveMediaRoute,
    externalIsPlaying,
    internalIsPlaying: isPlaying,
    isLoading,
    isReady,
    currentFile,
    playbackErrors,
    triggerPlay: () => setIsPlaying(true),
    triggerPause: () => setIsPlaying(false),
    onInternalPlayStateChange: onPlayingChange
  });

  // Error handling with auto-fallback to native
  useAudioErrorHandling({
    currentFile,
    playerAudioError: playbackErrors,
    onSwitchToNative: switchToNativeAudio
  });

  // Audio unlock mechanism for iOS
  useAudioUnlock();

  // Playback control wrappers
  const {
    handlePlayPause,
    handleSeekToSegment
  } = useAudioPlaybackControl({
    isPlaying,
    playbackErrors,
    originalHandlePlayPause,
    seekToTimestamp
  });

  // Log player state changes - but only when significant changes happen
  useEffect(() => {
    if (currentFile) {
      // Added safety check for volume display
      const safeVolume = Array.isArray(volume) && volume.length > 0 && isFinite(volume[0]) 
        ? volume[0] 
        : 50;
        
      console.log(
        `[useAudioProcessing] Player state: ${isPlaying ? 'playing' : 'paused'}, ` +
        `time: ${currentTime.toFixed(1)}/${duration.toFixed(1)}, ` +
        `volume: ${safeVolume}, ` +
        `muted: ${isMuted}, rate: ${playbackRate}, ` +
        `using: ${isUsingNativeAudio ? 'native' : 'howler'}`
      );
    }
  }, [isPlaying, currentFile, isUsingNativeAudio, playbackRate]);
  
  // Only log errors once to avoid console spam
  useEffect(() => {
    if (playbackErrors && playbackErrors !== previousErrorRef.current) {
      console.error("[useAudioProcessing] Audio playback error:", playbackErrors);
      previousErrorRef.current = playbackErrors;
    }
  }, [playbackErrors]);

  return {
    isPlaying,
    currentTime,
    duration,
    volume: ensureUiVolumeFormat(volume), // Ensure consistent volume format with enhanced validation
    isMuted,
    playbackRate,
    playbackErrors,
    isUsingNativeAudio, // Expose this so components can know which player is in use
    handlePlayPause: originalHandlePlayPause,
    handleSeek,
    handleSkip,
    handleToggleMute,
    handleVolumeChange, // Use the enhanced volume handler with validation
    handlePlaybackRateChange,
    handleSeekToSegment: seekToTimestamp,
    switchToNativeAudio,
    switchToHowler, // Expose the function to switch back if needed
  };
};
