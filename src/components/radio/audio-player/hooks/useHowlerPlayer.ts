import { useState, useEffect, useRef } from 'react';
import { Howl, Howler } from 'howler';
import { toast } from 'sonner';
import { validateAudioFile } from '@/utils/file-validation';

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

// Create a global error cache for audio errors
const audioErrorCache = new Map<string, number>();
const AUDIO_ERROR_COOLDOWN = 10000; // 10 seconds

// Global flag to track if we've unlocked audio context
let audioContextUnlocked = false;

// Helper function to check if we should show an error
const shouldShowAudioError = (fileId: string, errorType: string): boolean => {
  const now = Date.now();
  const cacheKey = `${fileId}-${errorType}`;
  const lastShown = audioErrorCache.get(cacheKey) || 0;
  
  if (now - lastShown > AUDIO_ERROR_COOLDOWN) {
    audioErrorCache.set(cacheKey, now);
    return true;
  }
  return false;
};

// Function to unlock audio context - needs to be called on a user interaction
const unlockAudioContext = () => {
  if (audioContextUnlocked) return;
  
  console.log('[HowlerPlayer] Attempting to unlock audio context');
  
  try {
    // Force resume the Howler context if it exists and is suspended
    if (Howler.ctx && Howler.ctx.state === 'suspended') {
      console.log('[HowlerPlayer] Found suspended Howler context, attempting to resume...');
      Howler.ctx.resume().then(() => {
        console.log('[HowlerPlayer] Successfully resumed Howler audio context');
        audioContextUnlocked = true;
      }).catch(err => {
        console.error('[HowlerPlayer] Failed to resume audio context:', err);
      });
    }
    
    // Create and immediately play+stop a silent sound
    const unlockHowl = new Howl({
      src: ['data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA/+M4wAAAAAAAAAAAAEluZm8AAAAPAAAAAwAAAbAAeHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHiAgICAgICAgICAgICAgICAgICAgICAgICAgICAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwP/7kGQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFhpbmcAAAAPAAAAKwAACcoAIiIiIiIiIiIiIjMzMzMzMzMzMzMzVVVVVVVVVVVVVVVmZmZmZmZmZmZmZnd3d3d3d3d3d3d3iIiIiIiIiIiIiIiZmZmZmZmZmZmZmZmqqqqqqqqqqqqqqqqqqru7u7u7u7u7u7u7u7u7zMzMzMzMzMzMzMzMzMzM3d3d3d3d3d3d3d3d3d3d7u7u7u7u7u7u7u7u7u7u//////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAXVQ0YAAAAr/+OAxAAAAZEITlEBMAYWUWkrEBmAF4XhcR8HgeIowoUQnDICiCDTB0GQZBE3hIMgwdB8HwZB8HwZBkEQZBkHwZB8GQZBgHwZBkGQZB8HwZB8GQZBsEQZBkGQfB8HwZB8GQZBsEQZBE3hIMgwdB8HwZB8HwZBkEQZBkHwZB8GQZBgHwZBkGQZB8HwZB8GQZBsEQZBkGQfB8HwZB8GQZBsEQZBE3hIMgwdB8HwZB8HwZBkEQZBkHwZB8GQZBgHwZBkGQZB8HwZB8GQZBv/434cIRQnDICiCDTB0GQZBE3hIMgwdB8HwZB8HwZBkEQZBkHwZB8GQZBgHwZBkGQZB8HwZB8GQZBsEQZBkGQfB8HwZB8GQZBsEQZBE3hIMgwdB8HwZB8HwZBkEQZBkHwZB8GQZBgHwZBkGQZB8HwZB8GQZBsEQZBkGQfB8HwZB8GQZBsEQZBE3hIMgwdB8HwZB8HwZBkEQZBkHwZB8GQZBgHwZBk'],
      volume: 0.001, // Very low volume, almost inaudible
      format: ['mp3'],
      onplayerror: () => {
        console.warn('[HowlerPlayer] Audio context unlock failed on first attempt');
        // Try an alternative method on iOS
        const context = Howler.ctx;
        if (context && context.state === 'suspended') {
          context.resume().then(() => {
            console.log('[HowlerPlayer] Audio context resumed successfully via explicit call');
            audioContextUnlocked = true;
          }).catch(err => {
            console.error('[HowlerPlayer] Failed to resume audio context:', err);
          });
        }
      },
      onplay: () => {
        console.log('[HowlerPlayer] Audio context unlocked via dummy sound');
        audioContextUnlocked = true;
        // Stop the sound immediately
        setTimeout(() => unlockHowl.stop(), 10);
      }
    });
    
    // Play and then immediately stop
    unlockHowl.play();
  } catch (e) {
    console.error('[HowlerPlayer] Error unlocking audio context:', e);
  }
};

// Try to detect mobile or Safari browser
const isMobileSafari = () => {
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) || 
         (/Safari/.test(ua) && !/Chrome/.test(ua));
};

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
  const lastFileRef = useRef<string>('');
  const seekTarget = useRef<number | null>(null);
  const seekRetryCount = useRef<number>(0);
  const loadErrorCount = useRef<number>(0);
  const userInteractedRef = useRef<boolean>(false);
  
  // Operation tracking refs to prevent race conditions
  const isOperationPending = useRef<boolean>(false);
  const lastPlayPauseTime = useRef<number>(0);
  const playPauseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track user interaction to unlock audio
  useEffect(() => {
    const handleUserInteraction = () => {
      if (!userInteractedRef.current) {
        userInteractedRef.current = true;
        console.log('[HowlerPlayer] User interaction detected, unlocking audio context');
        unlockAudioContext();
      }
    };

    // Listen for user interactions throughout the app - expanded event types
    document.addEventListener('click', handleUserInteraction, { capture: true });
    document.addEventListener('touchstart', handleUserInteraction, { capture: true });
    document.addEventListener('keydown', handleUserInteraction, { capture: true });
    document.addEventListener('mousedown', handleUserInteraction, { capture: true });
    
    // Attempt to unlock audio context immediately if Typeform is present
    // This helps avoid conflicts with Typeform's audio context handling
    if (window.tf) {
      console.log('[HowlerPlayer] Typeform detected, preemptively unlocking audio context');
      setTimeout(unlockAudioContext, 100);
    }

    return () => {
      document.removeEventListener('click', handleUserInteraction, { capture: true });
      document.removeEventListener('touchstart', handleUserInteraction, { capture: true });
      document.removeEventListener('keydown', handleUserInteraction, { capture: true });
      document.removeEventListener('mousedown', handleUserInteraction, { capture: true });
    };
  }, []);

  // Detect file format from name or MIME type with enhanced detection
  const detectFormat = (file?: File): string[] | null => {
    if (!file) return null;
    
    // Extract format from file extension
    const fileNameFormat = file.name.split('.').pop()?.toLowerCase();
    
    // Check MIME type first, then filename extension
    const formats = SUPPORTED_FORMATS.filter(format => 
      file.type.includes(format) || 
      (fileNameFormat && format === fileNameFormat)
    );
    
    // If we couldn't detect format from MIME or filename, use a default set
    if (formats.length === 0) {
      // For files without clear format info, include the most common formats
      return ['mp3', 'wav', 'ogg'];
    }
    
    return formats;
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
      try {
        howlRef.current.unload();
      } catch (e) {
        console.warn('[HowlerPlayer] Error unloading howl instance:', e);
      }
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
  };

  // Enhanced play function that handles audio context and autoplay restrictions
  const forceSafePlay = async (howl: Howl): Promise<boolean> => {
    if (!howl) return false;
    
    try {
      // Check if audio context is in suspended state
      const context = Howler.ctx;
      if (context && context.state === 'suspended') {
        console.log('[HowlerPlayer] Audio context is suspended, attempting to resume');
        try {
          await context.resume();
          console.log('[HowlerPlayer] Audio context resumed successfully');
        } catch (err) {
          console.warn('[HowlerPlayer] Failed to resume audio context:', err);
          // Continue anyway, the play() might still work or trigger the user permission dialog
        }
      }
      
      // Special handling for Safari browsers which are stricter with autoplay
      if (isMobileSafari() && !userInteractedRef.current) {
        console.log('[HowlerPlayer] Mobile Safari detected without user interaction, play may fail');
      }
      
      // Attempt to play with timeout to prevent hanging
      const playPromise = new Promise<boolean>((resolve, reject) => {
        // Set timeout to prevent hanging if play() never resolves/rejects
        const timeout = setTimeout(() => {
          console.warn('[HowlerPlayer] Play timeout occurred');
          reject(new Error('Play timeout'));
        }, 2000);
        
        try {
          howl.once('play', () => {
            clearTimeout(timeout);
            resolve(true);
          });
          
          howl.once('playerror', (id, error) => {
            clearTimeout(timeout);
            reject(error || new Error('Playback error'));
          });
          
          // Actually trigger play
          howl.play();
        } catch (e) {
          clearTimeout(timeout);
          reject(e);
        }
      });
      
      return await playPromise;
    } catch (error) {
      console.error('[HowlerPlayer] Enhanced play failed:', error);
      return false;
    }
  };

  // Initialize Howler instance when file changes
  useEffect(() => {
    // Reset error state only when file identifier changes
    const currentFileId = file ? `${file.name}${file.lastModified}${file.size}` : '';
    
    // Only reset errors when we get a completely different file
    if (currentFileId !== lastFileRef.current) {
      setAudioError(null);
      errorShownRef.current = false;
      loadErrorCount.current = 0;
      lastFileRef.current = currentFileId;
    }
    
    setIsReady(false);
    setIsLoading(false);
    
    if (!file) {
      cleanupAudio();
      return;
    }

    // Extra check for reconstructed files that might cause errors
    const isReconstructedFile = (file as any).isReconstructed === true;
    
    // Special validation for reconstructed files
    if (isReconstructedFile) {
      console.log(`[HowlerPlayer] File ${file.name} is reconstructed from metadata, using extra caution`);
      // If we encounter errors with reconstructed files, we'll handle them silently
      loadErrorCount.current = isReconstructedFile ? 1 : 0;
    }

    // Validate file before attempting to create audio object
    if (!validateAudioFile(file)) {
      const errorMsg = 'Invalid audio file format';
      setAudioError(errorMsg);
      
      // Only show error if we should
      if (shouldShowAudioError(file.name, 'format')) {
        toast.error('Formato de audio no compatible');
        if (onError) onError(errorMsg);
      }
      return;
    }

    try {
      console.log(`[HowlerPlayer] Initializing audio with file: ${file.name}, type: ${file.type}, size: ${file.size} bytes`);
      setIsLoading(true);
      
      // Clean up previous audio resources
      cleanupAudio();
      
      // Create object URL for the file
      const fileUrl = URL.createObjectURL(file!);
      audioUrlRef.current = fileUrl;
      
      // Detect format from file
      const formats = detectFormat(file);
      console.log(`[HowlerPlayer] Detected formats: ${formats?.join(', ')}`);
      
      // Force unlock audio context - this is critical for playback to work
      unlockAudioContext();
      
      // Create new Howl instance with enhanced configuration
      const sound = new Howl({
        src: [fileUrl],
        html5: true, // Force HTML5 Audio to handle large files better
        preload: true,
        format: formats || undefined,
        autoplay: false,
        onload: () => {
          console.log(`[HowlerPlayer] Audio loaded successfully: ${file.name}`);
          setDuration(sound.duration());
          setIsLoading(false);
          setIsReady(true);
          loadErrorCount.current = 0; // Reset error count on successful load
          
          // Check if audio context is suspended and try to resume it
          if (Howler.ctx && Howler.ctx.state === 'suspended') {
            console.log('[HowlerPlayer] Audio context is suspended after load, attempting to resume');
            Howler.ctx.resume().catch(e => 
              console.warn('[HowlerPlayer] Could not resume audio context after load:', e)
            );
          }
          
          // Restore saved position if available
          const storedPosition = sessionStorage.getItem('audio-position');
          if (storedPosition) {
            const position = parseFloat(storedPosition);
            if (!isNaN(position) && position > 0) {
              sound.seek(position);
              setCurrentTime(position);
              
              // If there was a pending seek target, try to apply it now
              if (seekTarget.current !== null) {
                handleSeekInternal(seekTarget.current);
                seekTarget.current = null;
              }
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
        onloaderror: (id, err) => {
          loadErrorCount.current += 1;
          
          // Special handling for reconstructed files - silent failure
          const isReconstructedFile = (file as any).isReconstructed === true;
          const errorMessage = `Failed to load audio: ${err || 'Unknown error'}`;
          
          // Log but don't show UI errors for reconstructed files after first attempt
          if (isReconstructedFile && loadErrorCount.current > 1) {
            console.log(`[HowlerPlayer] Silent failure for reconstructed file: ${file.name}`);
            setIsLoading(false);
            isOperationPending.current = false;
            setAudioError(errorMessage);
            return;
          }
          
          console.error(`[HowlerPlayer] ${errorMessage}`);
          setIsLoading(false);
          isOperationPending.current = false;
          
          // Only show toast if it's a new error or enough time has passed
          if (!errorShownRef.current && shouldShowAudioError(file.name, 'load')) {
            errorShownRef.current = true;
            setAudioError(errorMessage);
            
            // Different messages based on if it's a reconstructed file
            const toastMessage = isReconstructedFile ? 
              'Error cargando archivo de sesión anterior' : 
              'Error cargando archivo de audio';
            
            toast.error(toastMessage, {
              description: isReconstructedFile ? 
                'Por favor cargue el archivo nuevamente' : 
                'El archivo puede estar corrupto o en un formato no compatible',
              duration: 5000,
            });
            
            if (onError) onError(errorMessage);
          }
        },
        onplayerror: (id, err) => {
          // Handle AbortError - this is expected when rapid play/pause actions occur
          const isAbortError = err && 
            (typeof err === 'string' && err.includes('AbortError') || 
             typeof err === 'object' && (err as any)?.name === 'AbortError');
          
          if (isAbortError) {
            console.log('[HowlerPlayer] Play interrupted (AbortError) - likely due to rapid play/pause actions');
            isOperationPending.current = false;
            return; // Silently handle AbortError
          }
          
          // Handle other errors
          const errorMessage = `Error playing audio: ${err || 'Unknown error'}`;
          console.error(`[HowlerPlayer] ${errorMessage}`);
          setIsPlaying(false);
          isOperationPending.current = false;
          
          // Only show toast if it's a new error or enough time has passed
          if (!errorShownRef.current && shouldShowAudioError(file.name, 'play')) {
            errorShownRef.current = true;
            setAudioError(errorMessage);
            
            toast.error('Error reproduciendo archivo de audio', {
              description: 'Hubo un problema al reproducir este archivo',
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
      
      // Set initial volume
      sound.volume(volume[0] / 100);
      
      // Save Howl instance to ref
      howlRef.current = sound;
      
      // Proactively check for audio context every 2 seconds to keep it active
      const contextCheckInterval = setInterval(() => {
        if (Howler.ctx && Howler.ctx.state === 'suspended') {
          console.log('[HowlerPlayer] Audio context suspended during playback, attempting to resume');
          Howler.ctx.resume().then(() => {
            console.log('[HowlerPlayer] Audio context successfully resumed');
          }).catch(e => {
            console.warn('[HowlerPlayer] Failed to resume suspended audio context:', e);
          });
        }
      }, 2000);
      
      // Cleanup function
      return () => {
        clearInterval(contextCheckInterval);
        console.log('[HowlerPlayer] Cleaning up audio resources');
        cleanupAudio();
      };
    } catch (error) {
      console.error('[HowlerPlayer] Error initializing audio player:', error);
      setIsLoading(false);
      isOperationPending.current = false;
      
      // Only show toast if it's a new error or enough time has passed
      if (!errorShownRef.current && shouldShowAudioError(file.name, 'init')) {
        errorShownRef.current = true;
        setAudioError(error instanceof Error ? error.message : 'Unknown error');
        
        toast.error('Error al configurar el reproductor de audio');
        if (onError) onError(`Error initializing audio: ${error}`);
      }
    }
  }, [file, onEnded, onError, playbackRate]);

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
            setTimeout(async () => {
              if (howlRef.current && !isOperationPending.current) {
                try {
                  isOperationPending.current = true;
                  await forceSafePlay(howlRef.current);
                  // Note: onplay callback will handle setting isPlaying state
                } catch (error) {
                  isOperationPending.current = false;
                  console.error('[HowlerPlayer] Error resuming audio on tab focus:', error);
                  toast.error('Couldn\'t resume audio automatically');
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

  // Play/pause toggle with enhanced audio context handling
  const handlePlayPause = async () => {
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
    
    // Use a small timeout to handle the case where multiple UI interactions
    // might trigger play/pause in rapid succession
    playPauseTimeoutRef.current = setTimeout(async () => {
      try {
        // Force resume the audio context before playing
        if (Howler.ctx && Howler.ctx.state === 'suspended') {
          console.log('[HowlerPlayer] Audio context is suspended, resuming before play/pause');
          try {
            await Howler.ctx.resume();
            console.log('[HowlerPlayer] Successfully resumed audio context');
          } catch (err) {
            console.warn('[HowlerPlayer] Failed to resume audio context:', err);
          }
        }
        
        if (isPlaying) {
          console.log('[HowlerPlayer] Pausing audio');
          howlRef.current?.pause();
          // Note: onpause callback will handle setting isPlaying state
        } else {
          console.log('[HowlerPlayer] Playing audio');
          userInteractedRef.current = true; // Mark that user has interacted
          
          // Use our enhanced play method
          const playSuccess = await forceSafePlay(howlRef.current!);
          
          if (!playSuccess) {
            console.warn('[HowlerPlayer] Enhanced play failed, falling back to regular play');
            howlRef.current?.play();
          }
          // Note: onplay callback will handle setting isPlaying state
        }
      } catch (error) {
        isOperationPending.current = false;
        console.error('[HowlerPlayer] Error in play/pause:', error);
        
        // Special handling for AbortError - common during rapid play/pause
        if (error instanceof Error && error.name === 'AbortError') {
          console.log('[HowlerPlayer] AbortError detected - ignoring as this is expected with rapid interactions');
        } else {
          // Only show toast if we should
          if (file && shouldShowAudioError(file.name, 'playback-action')) {
            toast.error('Error al reproducir archivo de audio');
          }
          if (onError && error instanceof Error) onError(error.message);
        }
      }
    }, 10);
  };

  // Seek to a specific position with bounce protection
  const handleSeek = (time: number) => {
    // Mark that user has interacted
    userInteractedRef.current = true;
    
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
    
    // Mark that user has interacted
    userInteractedRef.current = true;
    
    const currentPos = howlRef.current.seek() as number;
    const newTime = direction === 'forward'
      ? Math.min(currentPos + amount, duration)
      : Math.max(currentPos - amount, 0);
    
    handleSeek(newTime);
  };

  // Volume control
  const handleVolumeChange = (value: number[]) => {
    if (!howlRef.current) return;
    
    // Mark that user has interacted
    userInteractedRef.current = true;
    
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
    // Mark that user has interacted
    userInteractedRef.current = true;
    
    const newVolume = Math.min(100, volume[0] + 5);
    handleVolumeChange([newVolume]);
  };

  const handleVolumeDown = () => {
    // Mark that user has interacted
    userInteractedRef.current = true;
    
    const newVolume = Math.max(0, volume[0] - 5);
    handleVolumeChange([newVolume]);
  };

  // Toggle mute
  const handleToggleMute = () => {
    if (!howlRef.current) return;
    
    // Mark that user has interacted
    userInteractedRef.current = true;
    
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    howlRef.current.mute(newMutedState);
  };

  // Change playback rate
  const handlePlaybackRateChange = () => {
    if (!howlRef.current) return;
    
    // Mark that user has interacted
    userInteractedRef.current = true;
    
    const rates = [0.5, 1.0, 1.5, 2.0];
    const currentIndex = rates.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % rates.length;
    const newRate = rates[nextIndex];
    
    setPlaybackRate(newRate);
    howlRef.current.rate(newRate);
    toast.info(`Velocidad: ${newRate}x`);
  };

  // Force set playing state (for external control)
  const setIsPlayingState = async (playing: boolean) => {
    if (howlRef.current) {
      if (playing && !isPlaying && !isOperationPending.current) {
        // Add a small delay to ensure events don't conflict
        setTimeout(async () => {
          if (howlRef.current) {
            isOperationPending.current = true;
            userInteractedRef.current = true; // Consider this a user interaction
            await forceSafePlay(howlRef.current);
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

  // Return the same API interface as the original useAudioPlayer hook
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
