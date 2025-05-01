
import { useEffect } from "react";
import { useHowlerPlayer } from "@/components/radio/audio-player/hooks/useHowlerPlayer";
import { useAudioVisibilitySync } from "./processing/useAudioVisibilitySync";
import { useAudioPlaybackControl } from "./processing/useAudioPlaybackControl";
import { useAudioErrorHandling } from "./processing/useAudioErrorHandling";
import { useExternalAudioSync } from "./processing/useExternalAudioSync";
import { useAudioUnlock } from "./processing/useAudioUnlock";
import { UploadedFile } from "@/components/radio/types";

interface AudioProcessingOptions {
  currentFile: UploadedFile | null;
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
  // Initialize Howler player
  const {
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    playbackRate,
    playbackErrors: rawPlaybackErrors, // Rename to avoid confusion
    isLoading,
    isReady,
    handlePlayPause: originalHandlePlayPause,
    handleSeek,
    handleSkip,
    handleToggleMute,
    handleVolumeChange: originalHandleVolumeChange, // Rename
    handlePlaybackRateChange,
    setIsPlaying,
    seekToTimestamp
  } = useHowlerPlayer({
    file: currentFile,
    onPlayingChange
  });

  // Convert complex error object to string for simpler handling
  const playbackErrors = rawPlaybackErrors ?
    (typeof rawPlaybackErrors === 'string' ?
      rawPlaybackErrors :
      "Unknown error")
    : null;

  // Wrapper for handleVolumeChange to ensure it matches (value: number[]) => void
  const handleVolumeChange = (value: number[]) => {
    // Assuming the original handler from useHowlerPlayer might accept number or number[]
    // We ensure it receives number[] here. If it expects a single number, we'd need
    // to adapt, but the error suggests the interface expects number[] downstream.
    if (typeof originalHandleVolumeChange === 'function') {
       // Check if the original function expects a number or number[]
       // This is a basic check; more robust checking might be needed if types are complex
       try {
         // Attempt to call with array, assuming downstream expects it
         (originalHandleVolumeChange as (val: number[]) => void)(value);
       } catch (e) {
         // Fallback if array fails, try with single number (first element)
         console.warn("Volume handler might expect number, adapting.", e);
         (originalHandleVolumeChange as (val: number) => void)(value[0]);
       }
    }
  };


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

  // Error handling
  useAudioErrorHandling({
    currentFile,
    playerAudioError: playbackErrors
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

  // Log player state changes
  useEffect(() => {
    if (currentFile) {
      console.log(
        `[useAudioProcessing] Player state: ${isPlaying ? 'playing' : 'paused'}, ` +
        `time: ${currentTime.toFixed(1)}/${duration.toFixed(1)}, ` +
        `volume: ${Array.isArray(volume) ? volume[0] : volume}, ` +
        `muted: ${isMuted}, rate: ${playbackRate}`
      );
    }
  }, [isPlaying, currentTime, duration, volume, isMuted, playbackRate, currentFile]);

  return {
    isPlaying,
    currentTime,
    duration,
    volume, // This should already be number[] from useVolumeControls used by HowlerPlayer
    isMuted,
    playbackRate,
    playbackErrors,
    handlePlayPause,
    handleSeek,
    handleSkip,
    handleToggleMute,
    handleVolumeChange, // Pass the correctly typed wrapper
    handlePlaybackRateChange,
    handleSeekToSegment,
  };
};
