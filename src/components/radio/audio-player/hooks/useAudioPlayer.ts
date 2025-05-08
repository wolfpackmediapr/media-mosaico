
import { useState, useEffect, useRef } from 'react';
import { Howl } from 'howler';
import { toast } from 'sonner';
import { useMediaControls } from '../hooks/useMediaControls';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { usePlaybackControls } from '../hooks/usePlaybackControls';
import { useVolumeControls } from '../hooks/useVolumeControls';
import { useAudioProgress } from '../hooks/useAudioProgress';
import { formatTime } from '../utils/timeFormatter';

interface AudioPlayerOptions {
  file: File;
  onEnded?: () => void;
  onError?: (error: string) => void;
}

export const useAudioPlayer = ({ file, onEnded, onError }: AudioPlayerOptions) => {
  const howler = useRef<Howl | null>(null);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    try {
      setIsLoading(true);
      const fileUrl = URL.createObjectURL(file);
      const sound = new Howl({
        src: [fileUrl],
        onplay: () => setIsPlaying(true),
        onpause: () => setIsPlaying(false),
        onload: () => {
          setIsLoading(false);
          setIsReady(true);
        },
        onend: () => {
          setIsPlaying(false);
          if (onEnded) onEnded();
        },
        onstop: () => setIsPlaying(false),
        onloaderror: (id, error) => {
          console.error('Audio loading error:', error);
          toast.error('Error loading audio file');
          setIsLoading(false);
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
      setIsLoading(false);
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

  // Function to try using a storage URL if available
  const tryUseStorageUrl = async (): Promise<boolean> => {
    // Default implementation, returns false to indicate no storage URL was used
    return false;
  };

  return {
    isPlaying,
    currentTime: howler.current ? howler.current.seek() as number : 0,
    duration: howler.current?.duration() || 0,
    volume,
    isMuted,
    playbackRate,
    playbackErrors: null,
    isLoading,
    isReady,
    handlePlayPause,
    handleSeek,
    handleSkip,
    handleToggleMute: toggleMute,
    handleVolumeChange,
    handlePlaybackRateChange: changePlaybackRate,
    seekToTimestamp: handleSeek,
    tryUseStorageUrl
  };
};
