
import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useMediaControls } from './useMediaControls';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';

interface AudioPlayerOptions {
  file?: File;
  onEnded?: () => void;
  onError?: (error: string) => void;
  preservePlaybackOnBlur?: boolean;
  resumeOnFocus?: boolean;
}

export const useAudioPlayer = ({ file, onEnded, onError, preservePlaybackOnBlur = true, resumeOnFocus = true }: AudioPlayerOptions) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState<number[]>([50]);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressInterval = useRef<ReturnType<typeof setInterval>>();
  const wasPlayingBeforeBlur = useRef<boolean>(false);

  useEffect(() => {
    if (!file) return;

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
      
      // Load stored position if available
      const storedPosition = sessionStorage.getItem('audio-position');
      if (storedPosition) {
        const position = parseFloat(storedPosition);
        if (!isNaN(position) && position > 0) {
          audio.currentTime = position;
          setProgress(position);
        }
      }
      
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

  const handleToggleMute = () => {
    if (!audioRef.current) return;
    const newMutedState = !isMuted;
    audioRef.current.muted = newMutedState;
    setIsMuted(newMutedState);
  };

  const handlePlaybackRateChange = () => {
    if (!audioRef.current) return;
    const rates = [0.5, 1.0, 1.5, 2.0];
    const currentIndex = rates.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % rates.length;
    const newRate = rates[nextIndex];
    
    audioRef.current.playbackRate = newRate;
    setPlaybackRate(newRate);
    toast.info(`Velocidad: ${newRate}x`);
  };

  // Add enhanced tab visibility handling
  useEffect(() => {
    if (!file) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab is being hidden, remember playback state
        wasPlayingBeforeBlur.current = isPlaying;
        
        // Store state in session storage for recovery
        if (preservePlaybackOnBlur) {
          sessionStorage.setItem('audio-was-playing', isPlaying ? 'true' : 'false');
          if (audioRef.current) {
            sessionStorage.setItem('audio-position', String(audioRef.current.currentTime));
          }
        }
      } else {
        // Tab is becoming visible again
        if (resumeOnFocus && wasPlayingBeforeBlur.current) {
          // Try to resume playback if it was playing before
          if (audioRef.current && !isPlaying) {
            const playPromise = audioRef.current.play();
            if (playPromise !== undefined) {
              playPromise
                .then(() => {
                  setIsPlaying(true);
                  updateProgress();
                })
                .catch(error => {
                  console.error('Error resuming audio on tab focus:', error);
                  // Don't show error toast on autoplay restrictions
                  if (!(error.name === 'NotAllowedError')) {
                    toast.error('Couldn\'t resume audio automatically');
                  }
                });
            }
          }
        }
        
        // Recover position if needed
        const storedPosition = sessionStorage.getItem('audio-position');
        if (storedPosition && audioRef.current) {
          const position = parseFloat(storedPosition);
          if (!isNaN(position) && position > 0) {
            audioRef.current.currentTime = position;
            setProgress(position);
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [file, isPlaying, preservePlaybackOnBlur, resumeOnFocus]);
  
  useMediaControls({
    onPlay: () => !isPlaying && handlePlayPause(),
    onPause: () => isPlaying && handlePlayPause(),
    onSeekBackward: (details) => handleSkip('backward', details.seekOffset),
    onSeekForward: (details) => handleSkip('forward', details.seekOffset),
    title: file?.name || 'Audio'
  });

  useKeyboardShortcuts({
    onPlayPause: handlePlayPause,
    onSkipBackward: () => handleSkip('backward'),
    onSkipForward: () => handleSkip('forward'),
    onVolumeUp: handleVolumeUp,
    onVolumeDown: handleVolumeDown
  });

  return {
    isPlaying,
    currentTime: progress,
    duration,
    volume,
    isMuted,
    playbackRate,
    handlePlayPause,
    handleSeek,
    handleSkip,
    handleToggleMute,
    handleVolumeChange,
    handlePlaybackRateChange,
    seekToTimestamp: handleSeek,
    setIsPlaying
  };
};
