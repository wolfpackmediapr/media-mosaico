
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
    audioRef,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    playbackRate,
    errors: playbackErrors,
    setIsPlaying,
    play,
    pause,
    seek,
    setVolume,
    setIsMuted,
    setPlaybackRate,
    handleSeekToSegment,
  } = useHowlerPlayer({ 
    audioFile: currentFile,
    onPlayingStateChange: onPlayingChange
  });

  // Handle player state sync with other tabs
  useAudioVisibilitySync({
    audioRef,
    isPlaying,
    setIsPlaying: play
  });

  // Sync with external playing state (like media session)
  useExternalAudioSync({
    externalIsPlaying,
    currentIsPlaying: isPlaying,
    onSetPlaying: setIsPlaying,
    isActive: isActiveMediaRoute
  });

  // Error handling
  useAudioErrorHandling({
    playbackErrors,
    fileName: currentFile?.name
  });

  // Audio unlock mechanism for iOS
  useAudioUnlock();

  // Playback control wrappers
  const {
    handlePlayPause,
    handleSeek,
    handleSkip,
    handleToggleMute,
    handleVolumeChange,
    handlePlaybackRateChange,
  } = useAudioPlaybackControl({
    isPlaying,
    play,
    pause,
    seek,
    duration,
    setVolume,
    setIsMuted,
    setPlaybackRate,
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
