
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
  // Add debounce ref to prevent rapid button clicks
  const lastActionTimeRef = useRef<number>(0);

  // Debounce utility to prevent rapid consecutive actions
  const debounce = (fn: Function, delay: number = 200) => {
    const now = Date.now();
    if (now - lastActionTimeRef.current > delay) {
      lastActionTimeRef.current = now;
      fn();
    } else {
      console.log('[usePlaybackControls] Action debounced, ignoring');
    }
  };

  const handlePlayPause = useCallback(() => {
    if (!howl) {
      // Even without a howl instance, update the UI state
      setIsPlaying(!isPlaying);
      console.log('[usePlaybackControls] No howl instance, updating UI state only');
      return;
    }
    
    debounce(() => {
      try {
        // Try to unlock audio context first
        unmuteAudio();
        
        // Don't allow play/pause during seek operations
        if (seekOperationInProgressRef.current) {
          console.log('[usePlaybackControls] Ignoring play/pause during seek operation');
          return;
        }
        
        console.log(`[usePlaybackControls] ${isPlaying ? 'Pausing' : 'Playing'} audio`);
        
        if (isPlaying) {
          howl.pause();
        } else {
          howl.play();
        }
        
        // Force update the UI state to ensure it reflects the intended action
        // This helps when the howl event handlers might be delayed
        setIsPlaying(!isPlaying);
      } catch (error) {
        // If there's an error, at least try to update the UI state
        console.error('[usePlaybackControls] Error toggling playback:', error);
        setIsPlaying(!isPlaying);
      }
    });
  }, [howl, isPlaying, setIsPlaying]);

  const handleSeek = useCallback((time: number) => {
    if (!howl) {
      console.log('[usePlaybackControls] Cannot seek: No howl instance');
      return;
    }
    
    try {
      // Mark that a seek operation is in progress
      seekOperationInProgressRef.current = true;
      
      // Validate time input
      const validTime = Math.max(0, Math.min(time, duration || 0));
      
      // Log the seek operation
      console.log(`[usePlaybackControls] Seeking to ${validTime.toFixed(2)}s`);
      
      // Perform the seek operation
      howl.seek(validTime);
      
      // Reset the seek operation flag after a delay
      setTimeout(() => {
        seekOperationInProgressRef.current = false;
      }, 300); // Increased from 100ms to 300ms for better reliability
    } catch (error) {
      // Make sure to reset the flag even if an error occurs
      seekOperationInProgressRef.current = false;
      console.error('[usePlaybackControls] Error seeking:', error);
    }
  }, [howl, duration]);

  const handleSkip = useCallback((direction: 'forward' | 'backward', amount: number = 10) => {
    if (!howl) {
      console.log('[usePlaybackControls] Cannot skip: No howl instance');
      return;
    }

    debounce(() => {
      try {
        const skipAmount = direction === 'forward' ? amount : -amount;
        const newTime = Math.max(0, Math.min(currentTime + skipAmount, duration || 0));
        
        console.log(`[usePlaybackControls] Skipping ${direction} by ${amount}s to ${newTime.toFixed(2)}s`);
        
        handleSeek(newTime);
      } catch (error) {
        console.error('[usePlaybackControls] Error skipping:', error);
      }
    });
  }, [howl, currentTime, duration, handleSeek]);

  const handleToggleMute = useCallback(() => {
    debounce(() => {
      setIsMuted(prev => !prev);
      
      // Also update the Howl instance's mute state if available
      if (howl) {
        try {
          howl.mute(!isMuted);
          console.log(`[usePlaybackControls] Audio ${!isMuted ? 'muted' : 'unmuted'}`);
        } catch (error) {
          console.error('[usePlaybackControls] Error toggling mute:', error);
        }
      }
    });
  }, [setIsMuted, howl, isMuted]);

  const handleVolumeChange = useCallback((newVolume: number) => {
    debounce(() => {
      // Ensure volume is in the correct range
      const normalizedVolume = Math.max(0, Math.min(1, newVolume));
      setVolume(normalizedVolume);
      
      // Also update the Howl instance's volume if available
      if (howl) {
        try {
          howl.volume(normalizedVolume);
          console.log(`[usePlaybackControls] Volume set to ${normalizedVolume.toFixed(2)}`);
        } catch (error) {
          console.error('[usePlaybackControls] Error changing volume:', error);
        }
      }
    }, 100); // Use a shorter debounce for volume
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
    debounce(() => {
      // Validate rate is within typical bounds
      const validRate = Math.max(0.25, Math.min(4, newRate));
      setPlaybackRate(validRate);
      
      // Also update the Howl instance's rate if available
      if (howl) {
        try {
          howl.rate(validRate);
          console.log(`[usePlaybackControls] Playback rate set to ${validRate}x`);
        } catch (error) {
          console.error('[usePlaybackControls] Error changing playback rate:', error);
        }
      }
    });
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
