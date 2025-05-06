
import { useState, useEffect, useRef } from 'react';
import { Howl } from 'howler';
import { toast } from 'sonner';
import { useMediaControls } from './useMediaControls';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';
import { usePlaybackControls } from './usePlaybackControls';
import { useVolumeControls } from './useVolumeControls';
import { useAudioProgress } from './useAudioProgress';
import { formatTime } from './utils/timeFormatter';
import { PlayDirection } from '@/types/player';

interface AudioPlayerOptions {
  file: File;
  onEnded?: () => void;
  onError?: (error: string) => void;
}

export const useAudioPlayer = ({ file, onEnded, onError }: AudioPlayerOptions) => {
  const howler = useRef<Howl | null>(null);
  
  useEffect(() => {
    try {
      const fileUrl = URL.createObjectURL(file);
      const sound = new Howl({
        src: [fileUrl],
        onplay: () => setIsPlaying(true),
        onpause: () => setIsPlaying(false),
        onend: () => {
          setIsPlaying(false);
          if (onEnded) onEnded();
        },
        onstop: () => setIsPlaying(false),
        onloaderror: (id, error) => {
          console.error('Audio loading error:', error);
          toast.error('Error loading audio file');
          if (onError) onError(`Error loading audio: ${error}`);
        },
        onplayerror: (id, error) => {
          console.error('Audio playback error:', error);
          toast.error('Error playing audio file');
          if (onError) onError(`Error playing audio: ${error}`);
        }
      });

      howler.current = sound;

      return () => {
        sound.unload();
        URL.revokeObjectURL(fileUrl);
      };
    } catch (error) {
      console.error('Error initializing audio player:', error);
      toast.error('Error setting up audio player');
      if (onError) onError(`Error initializing audio: ${error}`);
    }
  }, [file, onEnded, onError]);

  const { isPlaying, handlePlayPause, handleSeek, handleSkip, changePlaybackRate, setIsPlaying } = usePlaybackControls({ 
    howler, 
    duration: howler.current?.duration() || 0 
  });

  const { volume, isMuted, handleVolumeChange, toggleMute } = useVolumeControls();

  const { progress } = useAudioProgress({ howler, file, isPlaying });

  useMediaControls({
    onPlay: () => !isPlaying && handlePlayPause(),
    onPause: () => isPlaying && handlePlayPause(),
    onSeekBackward: (details) => handleSkip('backward', details.seekOffset),
    onSeekForward: (details) => handleSkip('forward', details.seekOffset),
    title: file.name
  });

  useKeyboardShortcuts({
    onPlayPause: handlePlayPause,
    onSkipBackward: () => handleSkip('backward'),
    onSkipForward: () => handleSkip('forward'),
    onVolumeUp: () => {
      const newVolume = Math.min(100, volume[0] + 5);
      handleVolumeChange([newVolume]);
    },
    onVolumeDown: () => {
      const newVolume = Math.max(0, volume[0] - 5);
      handleVolumeChange([newVolume]);
    }
  });
  
  // Enhanced wrapper for skip that accepts PlayDirection from the new type definition
  const handleSkipWrapper = (direction: PlayDirection, amount: number = 10) => {
    handleSkip(direction, amount);
  };

  return {
    isPlaying,
    currentTime: progress,
    duration: howler.current?.duration() || 0,
    volume,
    isMuted,
    playbackRate: howler.current?.rate() || 1,
    handlePlayPause,
    handleSeek,
    handleSkip: handleSkipWrapper,
    handleToggleMute: toggleMute,
    handleVolumeChange,
    handlePlaybackRateChange: changePlaybackRate
  };
};
