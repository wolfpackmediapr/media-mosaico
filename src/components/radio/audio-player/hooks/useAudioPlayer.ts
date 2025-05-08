
import { useState, useEffect, useRef, useCallback } from 'react';
import { Howl } from 'howler';
import { toast } from 'sonner';
import { useMediaControls } from './useMediaControls';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';
import { usePlaybackControls } from './usePlaybackControls';
import { useVolumeControls } from './useVolumeControls';
import { useAudioProgress } from './useAudioProgress';
import { formatTime } from '../utils/timeFormatter';
import { useHowlerPlayer } from './useHowlerPlayer';

interface AudioPlayerOptions {
  file: File;
  onEnded?: () => void;
  onError?: (error: string) => void;
}

export const useAudioPlayer = ({ file, onEnded, onError }: AudioPlayerOptions) => {
  // Use the enhanced Howler player hook that supports Supabase URLs
  const playerInstance = useHowlerPlayer({
    file,
    onEnded,
    onError,
    preservePlaybackOnBlur: true,
    resumeOnFocus: true,
    preferNative: false  // Start with Howler for better control, fallback to native if needed
  });
  
  // Extract all properties from the player
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
    handlePlayPause,
    handleSeek,
    handleSkip,
    handleToggleMute,
    handleVolumeChange,
    handlePlaybackRateChange,
    seekToTimestamp,
    tryUseStorageUrl
  } = playerInstance;

  // Add a handler for storage URL fallback
  const handleTryStorageUrl = useCallback(async (): Promise<boolean> => {
    if (tryUseStorageUrl) {
      const result = tryUseStorageUrl();
      return result;
    }
    return false;
  }, [tryUseStorageUrl]);

  return {
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    playbackRate,
    playbackErrors,
    isLoading,
    isReady,
    handlePlayPause,
    handleSeek,
    handleSkip,
    handleToggleMute,
    handleVolumeChange,
    handlePlaybackRateChange,
    seekToTimestamp,
    tryUseStorageUrl: handleTryStorageUrl
  };
};
