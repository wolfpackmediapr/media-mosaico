
import { useState, useEffect, useRef } from 'react';
import { Howl } from 'howler';
import { toast } from 'sonner';
import { validateAudioFile } from '@/utils/file-validation';

interface AudioPlayerOptions {
  file?: File;
  onEnded?: () => void;
  onError?: (error: string) => void;
  preservePlaybackOnBlur?: boolean;
  resumeOnFocus?: boolean;
}

export const useHowlerPlayer = ({ 
  file, 
  onEnded, 
  onError, 
  preservePlaybackOnBlur = true, 
  resumeOnFocus = true 
}: AudioPlayerOptions) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState<number[]>([50]); // Using array for Slider compatibility
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [audioError, setAudioError] = useState<string | null>(null);

  const howlRef = useRef<Howl | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const progressInterval = useRef<ReturnType<typeof setInterval>>();
  const wasPlayingBeforeBlur = useRef<boolean>(false);
  const errorShownRef = useRef<boolean>(false);

  // Cleanup all resources and timers
  const cleanupAudio = () => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = undefined;
    }
    
    if (howlRef.current) {
      howlRef.current.unload();
      howlRef.current = null;
    }
    
    if (audioUrlRef.current) {
      try {
        URL.revokeObjectURL(audioUrlRef.current);
      } catch (e) {
        console.warn('Error revoking URL:', e);
      }
      audioUrlRef.current = null;
    }
  };

  // Initialize Howler instance when file changes
  useEffect(() => {
    // Reset error state when file changes
    setAudioError(null);
    errorShownRef.current = false;
    
    if (!file) {
      cleanupAudio();
      return;
    }

    // Validate file before attempting to create audio object
    if (!validateAudioFile(file)) {
      setAudioError('Invalid audio file format');
      return;
    }

    try {
      console.log(`[HowlerPlayer] Initializing audio with file: ${file.name}, type: ${file.type}, size: ${file.size} bytes`);
      
      // Clean up previous audio resources
      cleanupAudio();
      
      // Create object URL for the file
      const fileUrl = URL.createObjectURL(file);
      audioUrlRef.current = fileUrl;
      
      // Create new Howl instance
      const sound = new Howl({
        src: [fileUrl],
        html5: true, // Force HTML5 Audio to handle large files better
        preload: true,
        format: ['mp3', 'wav', 'ogg', 'aac', 'm4a'],
        onload: () => {
          console.log(`[HowlerPlayer] Audio loaded successfully: ${file.name}`);
          setDuration(sound.duration());
          
          // Restore saved position if available
          const storedPosition = sessionStorage.getItem('audio-position');
          if (storedPosition) {
            const position = parseFloat(storedPosition);
            if (!isNaN(position) && position > 0) {
              sound.seek(position);
              setCurrentTime(position);
            }
          }
        },
        onplay: () => {
          setIsPlaying(true);
          updateProgress();
        },
        onpause: () => {
          setIsPlaying(false);
          if (progressInterval.current) {
            clearInterval(progressInterval.current);
          }
        },
        onstop: () => {
          setIsPlaying(false);
          if (progressInterval.current) {
            clearInterval(progressInterval.current);
          }
        },
        onend: () => {
          console.log('[HowlerPlayer] Audio playback ended');
          setIsPlaying(false);
          if (progressInterval.current) {
            clearInterval(progressInterval.current);
          }
          if (onEnded) onEnded();
        },
        onloaderror: (id, err) => {
          const errorMessage = `Failed to load audio: ${err || 'Unknown error'}`;
          console.error(`[HowlerPlayer] ${errorMessage}`);
          
          if (!errorShownRef.current) {
            errorShownRef.current = true;
            setAudioError(errorMessage);
            toast.error('Error loading audio file', {
              description: 'The file may be corrupted or in an unsupported format',
              duration: 5000,
            });
            if (onError) onError(errorMessage);
          }
        },
        onplayerror: (id, err) => {
          const errorMessage = `Error playing audio: ${err || 'Unknown error'}`;
          console.error(`[HowlerPlayer] ${errorMessage}`);
          
          if (!errorShownRef.current) {
            errorShownRef.current = true;
            setAudioError(errorMessage);
            toast.error('Error playing audio file', {
              description: 'There was an issue playing this file',
              duration: 5000,
            });
            if (onError) onError(errorMessage);
          }
        }
      });
      
      // Set initial volume
      sound.volume(volume[0] / 100);
      
      // Save Howl instance to ref
      howlRef.current = sound;
      
      // Cleanup function
      return () => {
        console.log('[HowlerPlayer] Cleaning up audio resources');
        cleanupAudio();
      };
    } catch (error) {
      console.error('[HowlerPlayer] Error initializing audio player:', error);
      
      if (!errorShownRef.current) {
        errorShownRef.current = true;
        setAudioError(error instanceof Error ? error.message : 'Unknown error');
        toast.error('Error setting up audio player');
        if (onError) onError(`Error initializing audio: ${error}`);
      }
    }
  }, [file, onEnded, onError]);

  // Update volume when it changes
  useEffect(() => {
    if (howlRef.current) {
      howlRef.current.volume(volume[0] / 100);
      
      // Update mute state based on volume
      if (volume[0] === 0) {
        howlRef.current.mute(true);
        setIsMuted(true);
      } else if (isMuted) {
        howlRef.current.mute(false);
        setIsMuted(false);
      }
    }
  }, [volume, isMuted]);

  // Update playback rate when it changes
  useEffect(() => {
    if (howlRef.current) {
      howlRef.current.rate(playbackRate);
    }
  }, [playbackRate]);

  // Function to update progress
  const updateProgress = () => {
    if (!howlRef.current) return;
    
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
    }
    
    progressInterval.current = setInterval(() => {
      if (howlRef.current) {
        const time = howlRef.current.seek() as number;
        setCurrentTime(time || 0);
        
        // Store position for recovery
        if (preservePlaybackOnBlur && time > 0) {
          sessionStorage.setItem('audio-position', String(time));
        }
      }
    }, 1000);
  };

  // Handle visibility changes for tab switching
  useEffect(() => {
    if (!file) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab is being hidden, remember playback state
        wasPlayingBeforeBlur.current = isPlaying;
        
        if (preservePlaybackOnBlur) {
          sessionStorage.setItem('audio-was-playing', isPlaying ? 'true' : 'false');
          if (howlRef.current) {
            const position = howlRef.current.seek() as number;
            sessionStorage.setItem('audio-position', String(position));
          }
        }
      } else {
        // Tab is becoming visible again
        if (resumeOnFocus && wasPlayingBeforeBlur.current && howlRef.current) {
          console.log('[HowlerPlayer] Tab became visible, attempting to resume playback');
          // Try to resume playback if it was playing before
          if (!isPlaying && !audioError) {
            // Small delay to ensure audio context is ready
            setTimeout(() => {
              if (howlRef.current) {
                try {
                  howlRef.current.play();
                  // Note: onplay callback will handle setting isPlaying state
                } catch (error) {
                  console.error('[HowlerPlayer] Error resuming audio on tab focus:', error);
                  toast.error('Couldn\'t resume audio automatically');
                }
              }
            }, 100);
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [file, isPlaying, preservePlaybackOnBlur, resumeOnFocus, audioError]);

  // Play/pause toggle
  const handlePlayPause = () => {
    if (!howlRef.current) return;
    
    if (isPlaying) {
      console.log('[HowlerPlayer] Pausing audio');
      howlRef.current.pause();
      // Note: onpause callback will handle setting isPlaying state
    } else {
      console.log('[HowlerPlayer] Playing audio');
      try {
        howlRef.current.play();
        // Note: onplay callback will handle setting isPlaying state
      } catch (error) {
        console.error('[HowlerPlayer] Error playing audio:', error);
        toast.error('Error playing audio file');
        if (onError && error instanceof Error) onError(error.message);
      }
    }
  };

  // Seek to a specific position
  const handleSeek = (time: number) => {
    if (!howlRef.current) return;
    
    try {
      howlRef.current.seek(time);
      setCurrentTime(time);
      console.log(`[HowlerPlayer] Seeked to ${time}s`);
    } catch (error) {
      console.error('[HowlerPlayer] Error seeking:', error);
      // Don't show toast for seeking errors - usually boundary issues
    }
  };

  // Skip forward/backward
  const handleSkip = (direction: 'forward' | 'backward', amount: number = 10) => {
    if (!howlRef.current) return;
    
    const currentPos = howlRef.current.seek() as number;
    const newTime = direction === 'forward'
      ? Math.min(currentPos + amount, duration)
      : Math.max(currentPos - amount, 0);
    
    handleSeek(newTime);
  };

  // Volume control
  const handleVolumeChange = (value: number[]) => {
    if (!howlRef.current) return;
    
    setVolume(value);
    howlRef.current.volume(value[0] / 100);
    
    if (value[0] === 0) {
      setIsMuted(true);
      howlRef.current.mute(true);
    } else if (isMuted) {
      setIsMuted(false);
      howlRef.current.mute(false);
    }
  };

  // Utility functions to adjust volume
  const handleVolumeUp = () => {
    const newVolume = Math.min(100, volume[0] + 5);
    handleVolumeChange([newVolume]);
  };

  const handleVolumeDown = () => {
    const newVolume = Math.max(0, volume[0] - 5);
    handleVolumeChange([newVolume]);
  };

  // Toggle mute
  const handleToggleMute = () => {
    if (!howlRef.current) return;
    
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    howlRef.current.mute(newMutedState);
  };

  // Change playback rate
  const handlePlaybackRateChange = () => {
    if (!howlRef.current) return;
    
    const rates = [0.5, 1.0, 1.5, 2.0];
    const currentIndex = rates.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % rates.length;
    const newRate = rates[nextIndex];
    
    setPlaybackRate(newRate);
    howlRef.current.rate(newRate);
    toast.info(`Velocidad: ${newRate}x`);
  };

  // Force set playing state (for external control)
  const setIsPlayingState = (playing: boolean) => {
    if (howlRef.current) {
      if (playing && !isPlaying) {
        howlRef.current.play();
      } else if (!playing && isPlaying) {
        howlRef.current.pause();
      }
    } else {
      setIsPlaying(playing);
    }
  };

  // Return the same API interface as the original useAudioPlayer hook
  return {
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    playbackRate,
    audioError,
    handlePlayPause,
    handleSeek,
    handleSkip,
    handleToggleMute,
    handleVolumeChange,
    handlePlaybackRateChange,
    handleVolumeUp,
    handleVolumeDown,
    seekToTimestamp: handleSeek, // Alias for compatibility
    setIsPlaying: setIsPlayingState // Method to control playing state externally
  };
};
