
import { useEffect } from "react";
import { useHowlerPlayer } from "@/components/radio/audio-player/hooks/useHowlerPlayer";
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
  preferNativeAudio?: boolean; // New option to control native audio preference
}

export const useAudioProcessing = ({
  currentFile,
  isActiveMediaRoute = true,
  externalIsPlaying = false,
  onPlayingChange = () => {},
  preferNativeAudio = true // Default to using native audio first
}: AudioProcessingOptions) => {
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
    isUsingNativeAudio, // Track which player is active
    handlePlayPause: originalHandlePlayPause,
    handleSeek,
    handleSkip,
    handleToggleMute,
    handleVolumeChange,
    handlePlaybackRateChange,
    setIsPlaying,
    seekToTimestamp,
    switchToNativeAudio,
    switchToHowler,
  } = useHowlerPlayer({
    file: currentFile,
    onPlayingChange,
    preferNative: preferNativeAudio // Pass the preference to useHowlerPlayer
  });

  // Convert complex error object to string for simpler handling
  const playbackErrors = rawPlaybackErrors ?
    (typeof rawPlaybackErrors === 'string' ?
      rawPlaybackErrors :
      "Unknown error")
    : null;

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

  // Log player state changes
  useEffect(() => {
    if (currentFile) {
      console.log(
        `[useAudioProcessing] Player state: ${isPlaying ? 'playing' : 'paused'}, ` +
        `time: ${currentTime.toFixed(1)}/${duration.toFixed(1)}, ` +
        `volume: ${Array.isArray(volume) ? volume[0] : volume}, ` +
        `muted: ${isMuted}, rate: ${playbackRate}, ` +
        `using: ${isUsingNativeAudio ? 'native' : 'howler'}`
      );
    }
  }, [isPlaying, currentTime, duration, volume, isMuted, playbackRate, currentFile, isUsingNativeAudio]);

  return {
    isPlaying,
    currentTime,
    duration,
    volume: ensureUiVolumeFormat(volume), // Ensure consistent volume format
    isMuted,
    playbackRate,
    playbackErrors,
    isUsingNativeAudio, // Expose this so components can know which player is in use
    handlePlayPause,
    handleSeek,
    handleSkip,
    handleToggleMute,
    handleVolumeChange,
    handlePlaybackRateChange,
    handleSeekToSegment,
    switchToNativeAudio,
    switchToHowler, // Expose the function to switch back if needed
  };
};
