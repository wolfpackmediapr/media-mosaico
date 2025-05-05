
import { useCallback } from 'react';
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

  const handlePlayPause = useCallback(() => {
    if (!howl) return;
    
    // Try to unlock audio context first
    unmuteAudio();
    
    if (isPlaying) {
      howl.pause();
    } else {
      howl.play();
    }
  }, [howl, isPlaying]);

  const handleSeek = useCallback((time: number) => {
    if (!howl) return;
    howl.seek(time);
  }, [howl]);

  const handleSkip = useCallback((direction: 'forward' | 'backward', amount: number = 10) => {
    if (!howl) return;

    const skipAmount = direction === 'forward' ? amount : -amount;
    const newTime = Math.max(0, Math.min(currentTime + skipAmount, duration));
    handleSeek(newTime);
  }, [howl, currentTime, duration, handleSeek]);

  const handleToggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, [setIsMuted]);

  const handleVolumeChange = useCallback((newVolume: number) => {
    setVolume(newVolume);
  }, [setVolume]);

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
  }, [setPlaybackRate]);

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
