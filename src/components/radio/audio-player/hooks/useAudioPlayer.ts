
import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useMediaControls } from './useMediaControls';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';
import { validateAudioFile } from '@/utils/file-validation';

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
  const [audioLoadError, setAudioLoadError] = useState<string | null>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const progressInterval = useRef<ReturnType<typeof setInterval>>();
  const wasPlayingBeforeBlur = useRef<boolean>(false);
  const errorShownRef = useRef<boolean>(false);

  // Cleanup function to properly release resources
  const cleanupAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current.load();
    }
    
    if (audioUrlRef.current) {
      try {
        URL.revokeObjectURL(audioUrlRef.current);
      } catch (e) {
        console.warn('Error revoking URL:', e);
      }
      audioUrlRef.current = null;
    }
    
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = undefined;
    }
  };

  useEffect(() => {
    // Reset error state when file changes
    setAudioLoadError(null);
    errorShownRef.current = false;
    
    if (!file) {
      cleanupAudio();
      return;
    }

    // Validate file before attempting to create an audio object
    if (!validateAudioFile(file)) {
      setAudioLoadError('Invalid audio file format');
      return;
    }

    try {
      console.log(`[AudioPlayer] Initializing audio with file: ${file.name}, type: ${file.type}, size: ${file.size} bytes`);
      
      // Clean up previous audio resources
      cleanupAudio();
      
      const fileUrl = URL.createObjectURL(file);
      audioUrlRef.current = fileUrl;
      
      const audio = new Audio();
      
      // Add event listeners before setting src to catch loading errors
      audio.addEventListener('error', (e) => {
        const errorCode = audio.error ? audio.error.code : 'unknown';
        const errorMessage = audio.error ? audio.error.message : 'Unknown error';
        console.error(`[AudioPlayer] Audio error (${errorCode}): ${errorMessage}`, e);
        
        if (!errorShownRef.current) {
          errorShownRef.current = true;
          const formattedError = `Error loading audio: ${errorMessage}`;
          setAudioLoadError(formattedError);
          toast.error('Error loading audio file', {
            description: 'The file may be in an unsupported format',
            duration: 5000,
          });
          if (onError) onError(formattedError);
        }
      });
      
      audio.addEventListener('loadedmetadata', () => {
        console.log(`[AudioPlayer] Audio metadata loaded. Duration: ${audio.duration}s`);
        setDuration(audio.duration);
      });
      
      audio.addEventListener('ended', () => {
        console.log('[AudioPlayer] Audio playback ended');
        setIsPlaying(false);
        if (onEnded) onEnded();
      });
      
      // Set audio properties
      audio.preload = 'metadata';
      audio.volume = volume[0] / 100;
      audio.src = fileUrl;
      
      audioRef.current = audio;
      
      // Load stored position if available
      const storedPosition = sessionStorage.getItem('audio-position');
      if (storedPosition) {
        const position = parseFloat(storedPosition);
        if (!isNaN(position) && position > 0) {
          console.log(`[AudioPlayer] Restoring position: ${position}s`);
          audio.currentTime = position;
          setProgress(position);
        }
      }
      
      return () => {
        console.log('[AudioPlayer] Cleaning up audio resources');
        cleanupAudio();
      };
    } catch (error) {
      console.error('[AudioPlayer] Error initializing audio player:', error);
      if (!errorShownRef.current) {
        errorShownRef.current = true;
        setAudioLoadError(error instanceof Error ? error.message : 'Unknown error');
        toast.error('Error setting up audio player');
        if (onError) onError(`Error initializing audio: ${error}`);
      }
    }
  }, [file, onEnded, onError, volume]);

  const updateProgress = () => {
    if (!audioRef.current) return;
    progressInterval.current = setInterval(() => {
      if (audioRef.current && !audioRef.current.paused) {
        setProgress(audioRef.current.currentTime || 0);
      }
    }, 1000);
  };

  const handlePlayPause = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      console.log('[AudioPlayer] Pausing audio');
      audioRef.current.pause();
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
      setIsPlaying(false);
    } else {
      console.log('[AudioPlayer] Playing audio');
      // Use a Promise with proper error handling
      const playPromise = audioRef.current.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
            updateProgress();
          })
          .catch(error => {
            console.error('[AudioPlayer] Error playing audio:', error);
            
            // Handle different error types
            if (error.name === 'NotSupportedError') {
              toast.error('Audio format not supported by your browser');
            } else if (error.name === 'NotAllowedError') {
              console.warn('[AudioPlayer] Autoplay prevented by browser policy');
              // Don't show toast for autoplay restrictions
            } else {
              // Only show error toast if we haven't shown one already
              if (!errorShownRef.current) {
                errorShownRef.current = true;
                toast.error('Error playing audio file');
                if (onError) onError(`Error playing audio: ${error}`);
              }
            }
          });
      }
    }
  };

  const handleSeek = (time: number) => {
    if (!audioRef.current) return;
    
    try {
      audioRef.current.currentTime = time;
      setProgress(time);
      console.log(`[AudioPlayer] Seeked to ${time}s`);
    } catch (error) {
      console.error('[AudioPlayer] Error seeking:', error);
      // Don't show toast for seeking errors - they're usually just boundary issues
    }
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
        if (resumeOnFocus && wasPlayingBeforeBlur.current && audioRef.current) {
          console.log('[AudioPlayer] Tab became visible, attempting to resume playback');
          // Try to resume playback if it was playing before
          if (!isPlaying) {
            // Small delay to ensure audio context is ready
            setTimeout(() => {
              if (audioRef.current) {
                const playPromise = audioRef.current.play();
                if (playPromise !== undefined) {
                  playPromise
                    .then(() => {
                      setIsPlaying(true);
                      updateProgress();
                      console.log('[AudioPlayer] Successfully resumed playback');
                    })
                    .catch(error => {
                      console.error('[AudioPlayer] Error resuming audio on tab focus:', error);
                      // Don't show error toast on autoplay restrictions
                      if (!(error.name === 'NotAllowedError')) {
                        toast.error('Couldn\'t resume audio automatically');
                      }
                    });
                }
              }
            }, 100);
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
    onVolumeDown: handleVolumeDown,
    onToggleMute: handleToggleMute
  });

  return {
    isPlaying,
    currentTime: progress,
    duration,
    volume,
    isMuted,
    playbackRate,
    audioError: audioLoadError,
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
