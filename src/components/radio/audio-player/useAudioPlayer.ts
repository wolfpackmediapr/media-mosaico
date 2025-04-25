
import { useState, useEffect, useRef } from 'react';
import { Howl } from 'howler';
import { toast } from 'sonner';
import { useMediaControls } from './hooks/useMediaControls';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { usePlaybackControls } from './hooks/usePlaybackControls';
import { useVolumeControls } from './hooks/useVolumeControls';
import { useAudioProgress } from './hooks/useAudioProgress';
import { formatTime } from './utils/timeFormatter';

interface AudioPlayerOptions {
  file: File;
  onEnded?: () => void;
  onError?: (error: string) => void;
}

export const useAudioPlayer = ({ file, onEnded, onError }: AudioPlayerOptions) => {
  const howler = useRef<Howl | null>(null);
  const [playbackRate, setPlaybackRate] = useState(1);

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

  return {
    playbackState: {
      isPlaying,
      progress,
      duration: howler.current?.duration() || 0,
      isMuted
    },
    playbackRate,
    volumeControls: {
      isMuted,
      volume,
      handleVolumeChange,
      toggleMute
    },
    playbackControls: {
      handlePlayPause,
      handleSkip,
      handleSeek
    },
    changePlaybackRate
  };
};
