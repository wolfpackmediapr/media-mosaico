
import { useState, useEffect, useRef } from 'react';
import { Howl } from 'howler';
import { toast } from 'sonner';
import { useMediaSession } from '@/hooks/use-media-session';
import { usePersistentState } from '@/hooks/use-persistent-state';
import { AudioPlayerHookReturn } from './types';
import { formatTime } from './utils/timeFormatter';
import { useMediaControls } from './hooks/useMediaControls';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

export function useAudioPlayer(file: File, onEnded?: () => void, onError?: (error: string) => void): AudioPlayerHookReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const [volume, setVolume] = usePersistentState<number[]>(
    'audio-player-volume', 
    [50], 
    { storage: 'localStorage' }
  );
  
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = usePersistentState<number>(
    'audio-player-playback-rate',
    1,
    { storage: 'localStorage' }
  );
  
  const howler = useRef<Howl | null>(null);
  const progressInterval = useRef<ReturnType<typeof setInterval>>();
  
  const [lastPosition, setLastPosition] = usePersistentState<Record<string, number>>(
    'audio-player-positions',
    {},
    { storage: 'sessionStorage' }
  );

  // Function declarations before use
  const updateProgress = () => {
    if (!howler.current) return;

    progressInterval.current = setInterval(() => {
      if (howler.current) {
        const seek = howler.current.seek() || 0;
        setProgress(seek);
        
        const fileId = file.name + '-' + file.size;
        setLastPosition({...lastPosition, [fileId]: seek});
      }
    }, 1000);
  };

  const handlePlayPause = () => {
    if (!howler.current) return;

    if (isPlaying) {
      howler.current.pause();
    } else {
      howler.current.play();
    }
  };

  const handleSeek = (time: number) => {
    if (!howler.current) return;
    howler.current.seek(time);
    setProgress(time);
  };

  const handleSkip = (direction: 'forward' | 'backward', amount: number = 10) => {
    if (!howler.current) return;

    const currentTime = howler.current.seek() as number;
    const newTime = direction === 'forward'
      ? Math.min(currentTime + amount, duration)
      : Math.max(currentTime - amount, 0);

    howler.current.seek(newTime);
    setProgress(newTime);
  };

  const handleVolumeChange = (value: number[]) => {
    setVolume(value);
    if (value[0] === 0) {
      setIsMuted(true);
    } else if (isMuted) {
      setIsMuted(false);
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const changePlaybackRate = () => {
    // Cycle through common playback rates: 0.5, 1.0, 1.5, 2.0
    const rates = [0.5, 1.0, 1.5, 2.0];
    const currentIndex = rates.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % rates.length;
    setPlaybackRate(rates[nextIndex]);
    toast.info(`Velocidad: ${rates[nextIndex]}x`);
  };

  useEffect(() => {
    if (howler.current) {
      howler.current.unload();
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
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
            setProgress(lastPosition[fileId]);
          }
        },
        onplay: () => {
          setIsPlaying(true);
          updateProgress();
          sound.rate(playbackRate);
        },
        onpause: () => {
          setIsPlaying(false);
          if (progressInterval.current) {
            clearInterval(progressInterval.current);
          }
        },
        onend: () => {
          setIsPlaying(false);
          setProgress(0);
          if (progressInterval.current) {
            clearInterval(progressInterval.current);
          }
          if (onEnded) onEnded();
        },
        onstop: () => {
          setIsPlaying(false);
          setProgress(0);
          if (progressInterval.current) {
            clearInterval(progressInterval.current);
          }
        },
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
        if (progressInterval.current) {
          clearInterval(progressInterval.current);
        }
        
        const fileId = file.name + '-' + file.size;
        if (sound) {
          const currentPos = sound.seek() as number;
          if (currentPos > 0) {
            setLastPosition({...lastPosition, [fileId]: currentPos});
          }
        }
        URL.revokeObjectURL(fileUrl);
        sound.unload();
      };
    } catch (error) {
      console.error('Error initializing audio player:', error);
      toast.error('Error setting up audio player');
      if (onError) onError(`Error initializing audio: ${error}`);
    }
  }, [file, onEnded, onError]);

  // Apply volume changes to the Howler instance
  useEffect(() => {
    if (howler.current) {
      howler.current.volume(isMuted ? 0 : volume[0] / 100);
    }
  }, [volume, isMuted]);

  // Apply playback rate changes
  useEffect(() => {
    if (howler.current && isPlaying) {
      howler.current.rate(playbackRate);
    }
  }, [playbackRate, isPlaying]);

  // Setup media session controls
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

  // Setup keyboard shortcuts for audio controls
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
