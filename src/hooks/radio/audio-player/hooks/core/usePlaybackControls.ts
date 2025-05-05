
import { useCallback, useRef } from 'react';
import { Howl } from 'howler';
import { unmuteAudio } from '@/utils/audio-format-helper';

export interface PlaybackControls {
  handlePlayPause: () => void;
  handleSeek: (time: number) => void;
  handleSkip: (direction: 'forward' | 'backward', amount?: number) => void;
  handleToggleMute: () => void;
  handleVolumeChange: (newVolume: number) => void;
  handleVolumeUp: () => void;
  handleVolumeDown: () => void;
  handlePlaybackRateChange: (newRate: number) => void;
}

interface UsePlaybackControlsOptions {
  howl: Howl | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  playbackRate: number;
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  setIsMuted: React.Dispatch<React.SetStateAction<boolean>>;
  setVolume: React.Dispatch<React.SetStateAction<number>>;
  setPlaybackRate: React.Dispatch<React.SetStateAction<number>>;
}

/**
 * Hook for handling playback controls (play, pause, seek, etc.)
 */
export const usePlaybackControls = ({
  howl,
  isPlaying,
  currentTime,
  duration,
  volume,
  isMuted,
  playbackRate,
  setIsPlaying,
  setIsMuted,
  setVolume,
  setPlaybackRate
}: UsePlaybackControlsOptions): PlaybackControls => {
  // Add a reference to track seek operations
  const seekOperationInProgressRef = useRef<boolean>(false);

  const handlePlayPause = useCallback(() => {
    if (!howl) return;
    
    try {
      // Try to unlock audio context first
      unmuteAudio();
      
      // Don't allow play/pause during seek operations
      if (seekOperationInProgressRef.current) {
        console.log('[usePlaybackControls] Ignoring play/pause during seek operation');
        return;
      }
      
      if (isPlaying) {
        howl.pause();
      } else {
        howl.play();
      }
    } catch (error) {
      console.error('[usePlaybackControls] Error toggling playback:', error);
    }
  }, [howl, isPlaying]);

  const handleSeek = useCallback((time: number) => {
    if (!howl) return;
    
    try {
      // Mark that a seek operation is in progress
      seekOperationInProgressRef.current = true;
      
      // Log the seek operation
      console.log(`[usePlaybackControls] Seeking to ${time.toFixed(2)}s`);
      
      // Perform the seek operation
      howl.seek(time);
      
      // Reset the seek operation flag after a delay
      setTimeout(() => {
        seekOperationInProgressRef.current = false;
      }, 300); // Increased from 100ms to 300ms for better reliability
    } catch (error) {
      // Make sure to reset the flag even if an error occurs
      seekOperationInProgressRef.current = false;
      console.error('[usePlaybackControls] Error seeking:', error);
    }
  }, [howl]);

  const handleSkip = useCallback((direction: 'forward' | 'backward', amount: number = 10) => {
    if (!howl) return;

    try {
      const skipAmount = direction === 'forward' ? amount : -amount;
      const newTime = Math.max(0, Math.min(currentTime + skipAmount, duration));
      
      console.log(`[usePlaybackControls] Skipping ${direction} by ${amount}s to ${newTime.toFixed(2)}s`);
      
      handleSeek(newTime);
    } catch (error) {
      console.error('[usePlaybackControls] Error skipping:', error);
    }
  }, [howl, currentTime, duration, handleSeek]);

  const handleToggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
    
    // Also update the Howl instance's mute state if available
    if (howl) {
      try {
        howl.mute(!isMuted);
      } catch (error) {
        console.error('[usePlaybackControls] Error toggling mute:', error);
      }
    }
  }, [setIsMuted, howl, isMuted]);

  const handleVolumeChange = useCallback((newVolume: number) => {
    setVolume(newVolume);
    
    // Also update the Howl instance's volume if available
    if (howl) {
      try {
        howl.volume(newVolume);
      } catch (error) {
        console.error('[usePlaybackControls] Error changing volume:', error);
      }
    }
  }, [setVolume, howl]);

  const handleVolumeUp = useCallback(() => {
    const newVolume = Math.min(1, volume + 0.1);
    handleVolumeChange(newVolume);
  }, [volume, handleVolumeChange]);

  const handleVolumeDown = useCallback(() => {
    const newVolume = Math.max(0, volume - 0.1);
    handleVolumeChange(newVolume);
  }, [volume, handleVolumeChange]);

  const handlePlaybackRateChange = useCallback((newRate: number) => {
    setPlaybackRate(newRate);
    
    // Also update the Howl instance's rate if available
    if (howl) {
      try {
        howl.rate(newRate);
      } catch (error) {
        console.error('[usePlaybackControls] Error changing playback rate:', error);
      }
    }
  }, [setPlaybackRate, howl]);

  return {
    handlePlayPause,
    handleSeek,
    handleSkip,
    handleToggleMute,
    handleVolumeChange,
    handleVolumeUp,
    handleVolumeDown,
    handlePlaybackRateChange
  };
};
