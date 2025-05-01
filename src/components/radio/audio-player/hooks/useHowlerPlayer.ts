
import { useState, useEffect, useRef } from 'react';
import { Howl, Howler } from 'howler';
import { toast } from 'sonner';
import { validateAudioFile } from '@/utils/file-validation';
import { detectAudioFormat, getMostLikelyMimeType, getAudioFormatDetails, canBrowserPlayFile } from '@/utils/audio-format-helper';

interface AudioPlayerOptions {
  file?: File;
  onEnded?: () => void;
  onError?: (error: string) => void;
  preservePlaybackOnBlur?: boolean;
  resumeOnFocus?: boolean;
}

// Enhanced audio formats supported by Howler
const SUPPORTED_FORMATS = ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'webm'];

// Cooldown period to prevent rapid play/pause actions (milliseconds)
const PLAY_PAUSE_COOLDOWN = 300;

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
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const howlRef = useRef<Howl | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const progressInterval = useRef<ReturnType<typeof setInterval>>();
  const wasPlayingBeforeBlur = useRef<boolean>(false);
  const errorShownRef = useRef<boolean>(false);
  const seekTarget = useRef<number | null>(null);
  const seekRetryCount = useRef<number>(0);
  const isUsingHTML5Fallback = useRef<boolean>(false);
  
  // Operation tracking refs to prevent race conditions
  const isOperationPending = useRef<boolean>(false);
  const lastPlayPauseTime = useRef<number>(0);
  const playPauseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // AudioContext related refs
  const audioContextResumeAttempted = useRef<boolean>(false);
  const audioContextResumeCount = useRef<number>(0);

  // Function to attempt resuming AudioContext (to handle autoplay restrictions)
  const tryResumeAudioContext = () => {
    if (audioContextResumeAttempted.current || audioContextResumeCount.current > 3) return;
    
    try {
      const audioContext = (Howler as any).ctx;
      if (audioContext && audioContext.state === 'suspended') {
        console.log('[HowlerPlayer] Attempting to resume suspended AudioContext...');
        audioContext.resume().then(() => {
          console.log(`[HowlerPlayer] AudioContext resumed successfully: ${audioContext.state}`);
          audioContextResumeAttempted.current = true;
          
          // If we had a play attempt while context was suspended, retry playing
          if (howlRef.current && !isPlaying && !isOperationPending.current) {
            setTimeout(() => handlePlayPause(), 100);
          }
        }).catch((err: any) => {
          console.warn('[HowlerPlayer] Failed to resume AudioContext:', err);
          audioContextResumeCount.current++;
        });
      } else if (audioContext) {
        console.log(`[HowlerPlayer] AudioContext is already ${audioContext.state}`);
        audioContextResumeAttempted.current = true;
      }
    } catch (e) {
      console.warn('[HowlerPlayer] Error accessing AudioContext:', e);
    }
  };

  // Cleanup all resources and timers
  const cleanupAudio = () => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = undefined;
    }
    
    if (playPauseTimeoutRef.current) {
      clearTimeout(playPauseTimeoutRef.current);
      playPauseTimeoutRef.current = null;
    }
    
    if (howlRef.current) {
      howlRef.current.unload();
      howlRef.current = null;
    }
    
    if (audioUrlRef.current) {
      try {
        URL.revokeObjectURL(audioUrlRef.current);
      } catch (e) {
        console.warn('[HowlerPlayer] Error revoking URL:', e);
      }
      audioUrlRef.current = null;
    }
    
    setIsReady(false);
    seekTarget.current = null;
    seekRetryCount.current = 0;
    isOperationPending.current = false;
    audioContextResumeAttempted.current = false;
    audioContextResumeCount.current = 0;
    isUsingHTML5Fallback.current = false;
  };

  // Choose the best audio playback strategy based on file format
  const choosePlaybackStrategy = (file: File): boolean => {
    const format = detectAudioFormat(file);
    const details = getAudioFormatDetails(file);
    console.log(`[HowlerPlayer] File analysis: ${details}`);
    
    // Detect if browser can play this file directly
    const canPlay = canBrowserPlayFile(file);
    console.log(`[HowlerPlayer] Browser reports it can play this file: ${canPlay}`);
    
    // Special handling for MP3 files - prefer HTML5 Audio for better compatibility
    if (format === 'mp3' || (file.name && file.name.toLowerCase().endsWith('.mp3'))) {
      console.log('[HowlerPlayer] MP3 format detected - using HTML5 Audio player for better compatibility');
      return true; // Use HTML5 Audio for MP3s by default
    }
    
    // For other formats, use Web Audio API first with fallback to HTML5
    return false;
  };

  // Create a Howl instance with appropriate configuration
  const createHowl = (
    fileUrl: string, 
    useHTML5: boolean = false, 
    detectedFormat: string | null = null, 
    isFallback: boolean = false
  ): Howl => {
    console.log(`[HowlerPlayer] Creating Howl instance with html5=${useHTML5}, format=${detectedFormat || 'auto'}`);
    
    // Set formats array based on detected format or file extension
    let formats: string | undefined = undefined;
    
    if (detectedFormat) {
      formats = detectedFormat;
    } else if (file) {
      // Safely extract extension from filename
      const nameParts = file.name ? file.name.split('.') : [];
      if (nameParts.length > 1) {
        formats = nameParts.pop()?.toLowerCase();
      }
    } else if (fileUrl) {
      // Try to extract format from URL if file object is not available
      const urlParts = fileUrl.split('.');
      if (urlParts.length > 1) {
        formats = urlParts.pop()?.toLowerCase();
        
        // Clean up any query params
        if (formats && formats.includes('?')) {
          formats = formats.split('?')[0];
        }
      }
    }
    
    // Convert to array as required by Howler
    const formatsArray = formats ? [formats] : undefined;
    
    console.log(`[HowlerPlayer] Using audio format(s):`, formatsArray);
    
    // Return a configured Howl instance
    return new Howl({
      src: [fileUrl],
      html5: useHTML5, // Use HTML5 Audio instead of Web Audio API when true
      format: formatsArray,
      preload: true,
      autoplay: false,
      pool: 1, // Reduce pool size to save memory
      onload: () => {
        console.log(`[HowlerPlayer] Audio loaded successfully (html5=${useHTML5}): ${file?.name || fileUrl}`);
        setDuration(howlRef.current?.duration() || 0);
        setIsLoading(false);
        setIsReady(true);
        isUsingHTML5Fallback.current = useHTML5;
        
        // Attempt to unlock audio context
        tryResumeAudioContext();
        
        // Restore saved position if available
        const storedPosition = sessionStorage.getItem('audio-position');
        if (storedPosition) {
          const position = parseFloat(storedPosition);
          if (!isNaN(position) && position > 0) {
            howlRef.current?.seek(position);
            setCurrentTime(position);
            
            // If there was a pending seek target, try to apply it now
            if (seekTarget.current !== null) {
              handleSeekInternal(seekTarget.current);
              seekTarget.current = null;
            }
          }
        }
      },
      onloaderror: (id, err) => {
        // Improved error handling for loader errors
        const errorMessage = `Failed to load audio: ${err || 'Unknown error'}`;
        console.error(`[HowlerPlayer] ${errorMessage} (html5=${useHTML5})`);
        
        if (isFallback) {
          // If this is already a fallback attempt that failed
          setIsLoading(false);
          isOperationPending.current = false;
          
          if (!errorShownRef.current) {
            errorShownRef.current = true;
            setAudioError(errorMessage);
            
            // Log detailed file information for debugging
            if (file) {
              const details = getAudioFormatDetails(file);
              console.log(`[HowlerPlayer] File details: ${details}`);
            }
            
            toast.error('Error loading audio file', {
              description: 'The file may be corrupted or in an unsupported format',
              duration: 5000,
            });
            
            if (onError) onError(errorMessage);
          }
        } else {
          // Try HTML5 Audio as fallback if Web Audio API fails
          console.log("[HowlerPlayer] Web Audio API failed, attempting HTML5 audio fallback...");
          
          // Create a fallback Howl with HTML5 mode
          try {
            const fallbackSound = createHowl(fileUrl, true, detectedFormat, true);
            howlRef.current = fallbackSound;
          } catch (fallbackErr) {
            // Both attempts failed
            errorShownRef.current = true;
            setAudioError(`Failed to initialize audio player: ${fallbackErr}`);
            setIsLoading(false);
            
            toast.error('Error loading audio file', {
              description: 'The file format may not be supported by your browser',
              duration: 5000,
            });
            
            if (onError) onError(`Error initializing audio: ${fallbackErr}`);
          }
        }
      },
      onplay: () => {
        setIsPlaying(true);
        updateProgress();
        isOperationPending.current = false;
        
        // Announce playback started for screen readers
        const playbackRateText = playbackRate !== 1 ? ` at ${playbackRate}x speed` : '';
        console.log(`[HowlerPlayer] Playback started${playbackRateText}`);
      },
      onpause: () => {
        setIsPlaying(false);
        if (progressInterval.current) {
          clearInterval(progressInterval.current);
        }
        isOperationPending.current = false;
        console.log('[HowlerPlayer] Playback paused');
      },
      onstop: () => {
        setIsPlaying(false);
        if (progressInterval.current) {
          clearInterval(progressInterval.current);
        }
        isOperationPending.current = false;
        console.log('[HowlerPlayer] Playback stopped');
      },
      onend: () => {
        console.log('[HowlerPlayer] Audio playback ended');
        setIsPlaying(false);
        if (progressInterval.current) {
          clearInterval(progressInterval.current);
        }
        isOperationPending.current = false;
        if (onEnded) onEnded();
      },
      onplayerror: (id, err) => {
        // Handle AbortError - this is expected when rapid play/pause actions occur
        const isAbortError = err && 
          (typeof err === 'string' && err.includes('AbortError') || 
           (err && typeof err === 'object' && 'name' in err && (err as any).name === 'AbortError'));
        
        if (isAbortError) {
          console.log('[HowlerPlayer] Play interrupted (AbortError) - likely due to rapid play/pause actions');
          isOperationPending.current = false;
          
          // Try to resume AudioContext as this might be the issue
          tryResumeAudioContext();
          return; // Silently handle AbortError
        }
        
        // Handle other errors
        const errorMessage = `Error playing audio: ${err || 'Unknown error'}`;
        console.error(`[HowlerPlayer] ${errorMessage}`);
        setIsPlaying(false);
        isOperationPending.current = false;
        
        if (!errorShownRef.current) {
          errorShownRef.current = true;
          setAudioError(errorMessage);
          toast.error('Error playing audio file', {
            description: 'There was an issue playing this file',
            duration: 5000,
          });
          if (onError) onError(errorMessage);
        }
      },
      onseek: () => {
        // When a seek operation completes, update the current time
        if (howlRef.current) {
          const time = howlRef.current.seek() as number;
          setCurrentTime(time || 0);
          
          // If we had a specific seek target, check if we hit it accurately
          if (seekTarget.current !== null) {
            const actualPos = howlRef.current.seek() as number;
            const targetPos = seekTarget.current;
            
            // If we're not close enough to the target and haven't retried too many times, try again
            if (Math.abs(actualPos - targetPos) > 0.5 && seekRetryCount.current < 3) {
              console.log(`[HowlerPlayer] Seek retry ${seekRetryCount.current+1}/3: Target=${targetPos.toFixed(2)}s, Actual=${actualPos.toFixed(2)}s`);
              seekRetryCount.current++;
              setTimeout(() => {
                if (howlRef.current) {
                  howlRef.current.seek(targetPos);
                }
              }, 50);
            } else {
              // Clear seek target after successful seek or max retries
              seekTarget.current = null;
              seekRetryCount.current = 0;
              
              // Log seek completion
              console.log(`[HowlerPlayer] Seek completed to ${time.toFixed(2)}s`);
            }
          }
        }
      }
    });
  };

  // Initialize Howler instance when file changes
  useEffect(() => {
    // Reset error state when file changes
    setAudioError(null);
    errorShownRef.current = false;
    setIsReady(false);
    setIsLoading(false);
    
    if (!file) {
      cleanupAudio();
      return;
    }

    try {
      console.log(`[HowlerPlayer] Initializing audio with file: ${file.name}, type: ${file.type}, size: ${file.size} bytes`);
      setIsLoading(true);
      
      // Clean up previous audio resources
      cleanupAudio();
      
      // Verify file is accessible and valid
      if (!(file instanceof File) && !(file instanceof Blob)) {
        throw new Error('Invalid file object provided');
      }
      
      // Create object URL for the file
      const fileUrl = URL.createObjectURL(file);
      audioUrlRef.current = fileUrl;
      
      // Detect format and determine best playback strategy
      const detectedFormat = detectAudioFormat(file);
      const useHTML5 = choosePlaybackStrategy(file);
      
      console.log(`[HowlerPlayer] Creating audio player with ${useHTML5 ? 'HTML5 Audio' : 'Web Audio API'}, detected format: ${detectedFormat || 'unknown'}`);
      
      // Create a new Howl instance with the determined configuration
      const sound = createHowl(fileUrl, useHTML5, detectedFormat);
      
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
      setIsLoading(false);
      isOperationPending.current = false;
      
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
    }, 200); // More frequent updates for smoother UI
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
            // Increased delay to ensure audio context is ready (500ms instead of 100ms)
            setTimeout(() => {
              if (howlRef.current && !isOperationPending.current) {
                try {
                  // Try to resume the AudioContext first
                  tryResumeAudioContext();
                  
                  // Then try to play
                  isOperationPending.current = true;
                  howlRef.current.play();
                  // Note: onplay callback will handle setting isPlaying state
                } catch (error) {
                  isOperationPending.current = false;
                  console.error('[HowlerPlayer] Error resuming audio on tab focus:', error);
                }
              }
            }, 500); // Increased delay for better tab focus recovery
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [file, isPlaying, preservePlaybackOnBlur, resumeOnFocus, audioError]);

  // Listen for user interactions to attempt resuming AudioContext
  useEffect(() => {
    const tryResumeOnInteraction = () => {
      tryResumeAudioContext();
    };
    
    // Add listeners for common user interactions
    document.addEventListener('click', tryResumeOnInteraction, { once: true });
    document.addEventListener('touchend', tryResumeOnInteraction, { once: true });
    document.addEventListener('keydown', tryResumeOnInteraction, { once: true });
    
    return () => {
      document.removeEventListener('click', tryResumeOnInteraction);
      document.removeEventListener('touchend', tryResumeOnInteraction);
      document.removeEventListener('keydown', tryResumeOnInteraction);
    };
  }, []);

  // Play/pause toggle with debouncing to prevent rapid calling
  const handlePlayPause = () => {
    if (!howlRef.current) return;
    
    const now = Date.now();
    
    // Prevent rapid play/pause actions by enforcing a cooldown period
    if (now - lastPlayPauseTime.current < PLAY_PAUSE_COOLDOWN) {
      console.log('[HowlerPlayer] Ignoring rapid play/pause action');
      return;
    }
    
    // Clear any existing timeout
    if (playPauseTimeoutRef.current) {
      clearTimeout(playPauseTimeoutRef.current);
    }

    // Track operation time and set pending state
    lastPlayPauseTime.current = now;
    
    // Return early if an operation is already pending
    if (isOperationPending.current) {
      console.log('[HowlerPlayer] Ignoring play/pause while operation is pending');
      return;
    }
    
    isOperationPending.current = true;
    
    // Try to resume the AudioContext first (important for Safari and mobile browsers)
    tryResumeAudioContext();
    
    // Use a small timeout to handle the case where multiple UI interactions
    // might trigger play/pause in rapid succession
    playPauseTimeoutRef.current = setTimeout(() => {
      try {
        if (isPlaying) {
          console.log('[HowlerPlayer] Pausing audio');
          howlRef.current?.pause();
          // Note: onpause callback will handle setting isPlaying state
        } else {
          console.log('[HowlerPlayer] Playing audio');
          
          // On first play attempt, we'll do multiple attempts if needed
          if (!audioContextResumeAttempted.current) {
            tryResumeAudioContext();
          }
          
          howlRef.current?.play();
          // Note: onplay callback will handle setting isPlaying state
          
          // If the audio doesn't start playing within a short time, try again with AudioContext resume
          setTimeout(() => {
            if (howlRef.current && !isPlaying && !isOperationPending.current) {
              console.log('[HowlerPlayer] Playback may have failed, trying again with AudioContext resume');
              tryResumeAudioContext();
              
              setTimeout(() => {
                if (howlRef.current && !isPlaying) {
                  try {
                    howlRef.current.play();
                  } catch (e) {
                    console.warn('[HowlerPlayer] Second play attempt failed:', e);
                    isOperationPending.current = false;
                  }
                }
              }, 100);
            }
          }, 300);
        }
      } catch (error) {
        isOperationPending.current = false;
        console.error('[HowlerPlayer] Error in play/pause:', error);
        
        // Special handling for AbortError - common during rapid play/pause
        const errObj = error as Error;
        if (errObj && errObj.name === 'AbortError') {
          console.log('[HowlerPlayer] AbortError detected - ignoring as this is expected with rapid interactions');
        } else {
          // Try to resume AudioContext as that might be the issue
          tryResumeAudioContext();
          
          // Only show toast for non-abort errors
          if (!(errObj && errObj.name === 'AbortError')) {
            toast.error('Error playing audio file');
            if (onError) onError(errObj ? errObj.message : String(error));
          }
        }
      }
    }, 10);
  };

  // Internal seek implementation with advanced error handling
  const handleSeekInternal = (time: number) => {
    if (!howlRef.current) {
      // Store seek target for when audio is loaded
      seekTarget.current = time;
      console.log(`[HowlerPlayer] Audio not ready, storing seek target: ${time}s`);
      return false;
    }
    
    try {
      // Store target for verification in onseek callback
      seekTarget.current = time;
      seekRetryCount.current = 0;
      
      // Apply the seek
      howlRef.current.seek(time);
      console.log(`[HowlerPlayer] Seeking to ${time.toFixed(2)}s`);
      return true;
    } catch (error) {
      console.error('[HowlerPlayer] Error seeking:', error);
      seekTarget.current = null;
      return false;
    }
  };

  // Seek to a specific position with bounce protection
  const handleSeek = (time: number) => {
    // Validate input
    if (typeof time !== 'number' || isNaN(time)) {
      console.error(`[HowlerPlayer] Invalid seek time: ${time}`);
      return;
    }
    
    // Clamp time to valid range
    const safeTime = Math.max(0, Math.min(time, duration));
    
    // Try to seek and update UI
    const seekSucceeded = handleSeekInternal(safeTime);
    if (seekSucceeded) {
      setCurrentTime(safeTime);
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
      if (playing && !isPlaying && !isOperationPending.current) {
        // Add a small delay to ensure events don't conflict
        setTimeout(() => {
          if (howlRef.current) {
            // Try to resume AudioContext first
            tryResumeAudioContext();
            
            isOperationPending.current = true;
            howlRef.current.play();
          }
        }, 50);
      } else if (!playing && isPlaying && !isOperationPending.current) {
        isOperationPending.current = true;
        howlRef.current.pause();
      }
    } else {
      setIsPlaying(playing);
    }
  };

  // This is a try/catch block with correct error handling
  const handleErrors = (error: unknown) => {
    // Safe type checking for error objects
    if (error && typeof error === 'object') {
      const errorObj = error as { name?: string; message?: string };
      if ('message' in errorObj) {
        console.error('[HowlerPlayer] Error:', errorObj.message);
      } else {
        console.error('[HowlerPlayer] Unknown error object:', errorObj);
      }
    } else {
      console.error('[HowlerPlayer] Non-object error:', String(error));
    }
  };

  return {
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    playbackRate,
    audioError,
    isLoading,
    isReady,
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
