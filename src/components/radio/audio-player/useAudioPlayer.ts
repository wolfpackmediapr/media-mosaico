
import { useRef, useEffect } from 'react';
import { Howl } from 'howler';
import { toast } from 'sonner';
import { useMediaControls } from './hooks/useMediaControls';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useAudioProgress } from './hooks/useAudioProgress';
import { usePlaybackControls } from './hooks/usePlaybackControls';
import { useVolumeControls } from './hooks/useVolumeControls';
import { formatTime } from './utils/timeFormatter';
import type { AudioPlayerHookReturn } from './types';

export function useAudioPlayer(file: File, onEnded?: () => void, onError?: (error: string) => void): AudioPlayerHookReturn {
  const howler = useRef<Howl | null>(null);
  const [duration, setDuration] = useState(0);

  const { isPlaying, playbackRate, handlePlayPause, handleSeek, handleSkip, changePlaybackRate, setIsPlaying } 
    = usePlaybackControls({ howler, duration });
  
  const { volume, isMuted, handleVolumeChange, toggleMute } 
    = useVolumeControls();
  
  const { progress, lastPosition } 
    = useAudioProgress({ howler, file, isPlaying });

  useEffect(() => {
    if (howler.current) {
      howler.current.unload();
    }

    try {
      const fileUrl = URL.createObjectURL(file);
      const sound = new Howl({
        src: [fileUrl],
        format: ['mp3', 'wav', 'ogg', 'm4a'],
        onload: () => {
          setDuration(sound.duration());
          
          const fileId = file.name + '-' + file.size;
          if (lastPosition[fileId]) {
            sound.seek(lastPosition[fileId]);
          }
        },
        onplay: () => {
          setIsPlaying(true);
          sound.rate(playbackRate);
        },
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

      sound.volume(volume[0] / 100);
      howler.current = sound;

      return () => {
        URL.revokeObjectURL(fileUrl);
        sound.unload();
      };
    } catch (error) {
      console.error('Error initializing audio player:', error);
      toast.error('Error setting up audio player');
      if (onError) onError(`Error initializing audio: ${error}`);
    }
  }, [file, onEnded, onError]);

  useEffect(() => {
    if (howler.current) {
      howler.current.volume(isMuted ? 0 : volume[0] / 100);
    }
  }, [volume, isMuted]);

  useEffect(() => {
    if (howler.current && isPlaying) {
      howler.current.rate(playbackRate);
    }
  }, [playbackRate, isPlaying]);

  useMediaControls({
    onPlay: () => !isPlaying && handlePlayPause(),
    onPause: () => isPlaying && handlePlayPause(),
    onSeekBackward: (details) => {
      const seekAmount = details.seekOffset || 10;
      handleSkip('backward', seekAmount);
    },
    onSeekForward: (details) => {
      const seekAmount = details.seekOffset || 10;
      handleSkip('forward', seekAmount);
    },
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
    howler,
    playbackState: {
      isPlaying,
      progress,
      duration,
      isMuted
    },
    playbackRate,
    setPlaybackRate,
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
    formatTime,
    changePlaybackRate
  };
}
