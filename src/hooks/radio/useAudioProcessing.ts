
import { useAudioPlayer } from './use-audio-player';
import { UploadedFile } from '@/components/radio/types';
import { useEffect, useRef, useCallback } from 'react';

interface AudioProcessingOptions {
  currentFile?: UploadedFile;
}

export const useAudioProcessing = ({ currentFile }: AudioProcessingOptions) => {
  // Track if component is mounted to prevent memory leaks
  const isMountedRef = useRef(true);
  const audioCleanupFnsRef = useRef<Array<() => void>>([]);

  const {
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
    seekToTimestamp
  } = useAudioPlayer({
    file: currentFile
  });

  const handleSeekToSegment = useCallback((timestamp: number) => {
    if (isMountedRef.current) {
      seekToTimestamp(timestamp);
    }
  }, [seekToTimestamp]);

  // Enhanced cleanup function to prevent memory leaks
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      // Execute all cleanup functions
      audioCleanupFnsRef.current.forEach(cleanup => cleanup());
      audioCleanupFnsRef.current = [];
    };
  }, []);

  // Register a cleanup function
  const registerCleanup = useCallback((cleanupFn: () => void) => {
    audioCleanupFnsRef.current.push(cleanupFn);
  }, []);

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
    registerCleanup
  };
};
