
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
    playbackErrors,
    isLoading,
    isReady,
    handlePlayPause: originalHandlePlayPause,
    handleSeek: originalHandleSeek,
    handleSkip: originalHandleSkip,
    handleToggleMute,
    handleVolumeChange,
    handlePlaybackRateChange,
    setIsPlaying,
    seekToTimestamp
  } = useHowlerPlayer({ 
    file: currentFile,
    onPlayingChange
  });

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

  // Create wrapper functions to maintain the API
  const handleSeek = originalHandleSeek;
  const handleSkip = originalHandleSkip;

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
