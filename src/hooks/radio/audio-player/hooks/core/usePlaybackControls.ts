import { useCallback, useRef } from 'react';
import { Howl } from 'howler';
import { unmuteAudio } from '@/utils/audio-format-helper';

export interface PlaybackControls {
  handlePlayPause: () => void;
  handleSeek: (time: number) => void;
  handleSkip: (direction: 'forward' | 'backward', amount?: number) => void;
  handleToggleMute: () => void;
  handleVolumeChange: (newVolume: number[]) => void; // Changed to number[] (e.g., [50])
  handleVolumeUp: () => void;
  handleVolumeDown: () => void;
  handlePlaybackRateChange: (newRate: number) => void;
}

interface UsePlaybackControlsOptions {
  howl: Howl | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number[]; // Changed to number[] (e.g., [50])
  isMuted: boolean;
  playbackRate: number;
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  setIsMuted: React.Dispatch<React.SetStateAction<boolean>>;
  setVolume: React.Dispatch<React.SetStateAction<number[]>>; // Changed to expect number[]
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
  volume, // Now number[]
  isMuted,
  playbackRate,
  setIsPlaying,
  setIsMuted,
  setVolume, // Now expects number[]
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
        // Note: Howler's onplay/onpause events should ideally handle setIsPlaying.
        // Direct call might lead to race conditions if not careful.
        // setIsPlaying(!isPlaying); // Consider if this is truly needed or if event handlers are sufficient
      } catch (error) {
        // If there's an error, at least try to update the UI state
        console.error('[usePlaybackControls] Error toggling playback:', error);
        // setIsPlaying(!isPlaying); // See comment above
      }
    });
  }, [howl, isPlaying, setIsPlaying]);

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
      const newTime = Math.max(0, Math.min(currentTime + skipAmount, duration || Infinity)); // Ensure duration is not NaN
      
      console.log(`[usePlaybackControls] Skipping ${direction} by ${amount}s to ${newTime.toFixed(2)}s`);
      
      handleSeek(newTime);
    } catch (error) {
      console.error('[usePlaybackControls] Error skipping:', error);
    }
  }, [howl, currentTime, duration, handleSeek]);

  const handleToggleMute = useCallback(() => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    
    if (howl) {
      try {
        howl.mute(newMutedState);
      } catch (error) {
        console.error('[usePlaybackControls] Error toggling mute:', error);
      }
    }
  }, [setIsMuted, howl, isMuted]);

  const handleVolumeChange = useCallback((newVolumeArray: number[]) => { // Accepts number[] e.g. [50]
    setVolume(newVolumeArray); // Set state with number[]
    
    if (howl) {
      try {
        const volumeValueForHowl = newVolumeArray[0] / 100; // Convert to 0-1 for Howler
        howl.volume(volumeValueForHowl);
      } catch (error) {
        console.error('[usePlaybackControls] Error changing volume:', error);
      }
    }
  }, [setVolume, howl]);

  const handleVolumeUp = useCallback(() => {
    const currentVolumePercent = volume[0]; // volume is number[]
    const newVolumePercent = Math.min(100, currentVolumePercent + 10); // Standard 10% increment
    handleVolumeChange([newVolumePercent]);
  }, [volume, handleVolumeChange]);

  const handleVolumeDown = useCallback(() => {
    const currentVolumePercent = volume[0]; // volume is number[]
    const newVolumePercent = Math.max(0, currentVolumePercent - 10);
    handleVolumeChange([newVolumePercent]);
  }, [volume, handleVolumeChange]);

  const handlePlaybackRateChange = useCallback((newRate: number) => {
    setPlaybackRate(newRate);
    
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
