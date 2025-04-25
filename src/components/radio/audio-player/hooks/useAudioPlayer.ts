
import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useMediaControls } from './useMediaControls';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';

interface AudioPlayerOptions {
  file: File;
  onEnded?: () => void;
  onError?: (error: string) => void;
}

export const useAudioPlayer = ({ file, onEnded, onError }: AudioPlayerOptions) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState<number[]>([50]);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressInterval = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    try {
      const fileUrl = URL.createObjectURL(file);
      const audio = new Audio(fileUrl);
      
      audio.onloadedmetadata = () => {
        setDuration(audio.duration);
      };
      
      audio.onended = () => {
        setIsPlaying(false);
        if (onEnded) onEnded();
      };
      
      audio.onerror = () => {
        const error = 'Error loading audio file';
        console.error(error);
        toast.error(error);
        if (onError) onError(error);
      };

      audioRef.current = audio;
      
      return () => {
        audio.pause();
        URL.revokeObjectURL(fileUrl);
        if (progressInterval.current) {
          clearInterval(progressInterval.current);
        }
      };
    } catch (error) {
      console.error('Error initializing audio player:', error);
      toast.error('Error setting up audio player');
      if (onError) onError(`Error initializing audio: ${error}`);
    }
  }, [file, onEnded, onError]);

  const updateProgress = () => {
    if (!audioRef.current) return;
    progressInterval.current = setInterval(() => {
      setProgress(audioRef.current?.currentTime || 0);
    }, 1000);
  };

  const handlePlayPause = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    } else {
      audioRef.current.play().catch(error => {
        console.error('Error playing audio:', error);
        toast.error('Error playing audio file');
        if (onError) onError(`Error playing audio: ${error}`);
      });
      updateProgress();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (time: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = time;
    setProgress(time);
  };

  const handleSkip = (direction: 'forward' | 'backward', amount: number = 10) => {
    if (!audioRef.current) return;
    const newTime = direction === 'forward'
      ? Math.min(audioRef.current.currentTime + amount, duration)
      : Math.max(audioRef.current.currentTime - amount, 0);
    
    handleSeek(newTime);
  };

  const handleVolumeChange = (value: number[]) => {
    if (!audioRef.current) return;
    
    setVolume(value);
    audioRef.current.volume = value[0] / 100;
    
    if (value[0] === 0) {
      setIsMuted(true);
      audioRef.current.muted = true;
    } else if (isMuted) {
      setIsMuted(false);
      audioRef.current.muted = false;
    }
  };

  const handleVolumeUp = () => {
    const newVolume = Math.min(100, volume[0] + 5);
    handleVolumeChange([newVolume]);
  };

  const handleVolumeDown = () => {
    const newVolume = Math.max(0, volume[0] - 5);
    handleVolumeChange([newVolume]);
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    const newMutedState = !isMuted;
    audioRef.current.muted = newMutedState;
    setIsMuted(newMutedState);
  };

  const changePlaybackRate = () => {
    if (!audioRef.current) return;
    const rates = [0.5, 1.0, 1.5, 2.0];
    const currentIndex = rates.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % rates.length;
    const newRate = rates[nextIndex];
    
    audioRef.current.playbackRate = newRate;
    setPlaybackRate(newRate);
    toast.info(`Velocidad: ${newRate}x`);
  };

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
    onVolumeUp: handleVolumeUp,
    onVolumeDown: handleVolumeDown
  });

  return {
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
    changePlaybackRate
  };
};
