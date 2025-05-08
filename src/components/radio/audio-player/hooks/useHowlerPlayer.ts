import { useState, useEffect, useCallback, useRef } from 'react';
import { Howler } from 'howler'; // Added Howler import
import { AudioMetadata } from '@/types/audio';
import { useAudioCore } from './core/useAudioCore';
import { usePlaybackState } from './core/usePlaybackState';
import { usePlaybackControls as useCorePlaybackControls } from './core/usePlaybackControls';
import { createNativeAudioElement, testAudioPlayback } from '@/utils/audio-format-helper';
import { toast } from 'sonner';
import { ensureAudioVolumeFormat } from '@/utils/audio-volume-adapter';

interface HowlerPlayerHookProps {
  file?: File;
  onEnded?: () => void;
  onError?: () => void;
  preservePlaybackOnBlur?: boolean;
  resumeOnFocus?: boolean;
  onPlayingChange?: (isPlaying: boolean) => void;
  preferNative?: boolean;
}

export const useHowlerPlayer = ({
  file,
  onEnded,
  onError,
  preservePlaybackOnBlur = true,
  resumeOnFocus = true,
  onPlayingChange,
  preferNative = true
}: HowlerPlayerHookProps) => {
  const [playbackErrors, setPlaybackErrors] = useState<string | null>(null);
  const nativeAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isUsingNativeAudio, setIsUsingNativeAudio] = useState(preferNative);
  const nativeAudioReadyRef = useRef<boolean>(false);
  const timeUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [metadata, setMetadata] = useState<AudioMetadata | null>(null);
  
  // Handle invalid blob URLs by automatically switching to native audio
  const handleInvalidBlobUrl = useCallback((file: File) => {
    console.log('[HowlerPlayer] Invalid blob URL detected, switching to native audio');
    if (!isUsingNativeAudio && file) {
      // Queue a switch to native audio
      setTimeout(() => switchToNativeAudio(), 0);
    }
  }, [isUsingNativeAudio]); // switchToNativeAudio will be referenced later
  
  // Initialize core state and player controls first before they're referenced
  // Fix: Use object destructuring instead of array destructuring for useAudioCore return value
  const coreAudio = useAudioCore({
    file: isUsingNativeAudio ? undefined : file,
    onEnded,
    onError: (error) => {
      if (onError) onError(error);
      setPlaybackErrors(error);
      
      if (nativeAudioReadyRef.current && !isUsingNativeAudio && file) {
        console.log('[useHowlerPlayer] Auto-switching to native audio after Howler error');
        // We'll call switchToNativeAudio once it's defined
        setTimeout(() => switchToNativeAudio(), 0);
      }
    },
    forceHTML5: true,
    onInvalidBlobUrl: handleInvalidBlobUrl // Now properly typed in the UseAudioCoreProps interface
  });

  // Extract coreState properties safely
  const {
    howl,
    setHowl,
    duration: coreDuration,
    isLoading,
    isReady,
    playbackErrors: corePlaybackErrors,
    setPlaybackErrors: coreSetPlaybackErrors
  } = coreAudio;

  // Fix: Ensure types match for playback state
  const playbackState = usePlaybackState({
    howl: !isUsingNativeAudio ? howl : null
  });
  
  // Destructure playback state with proper typing
  const [
    { isPlaying, currentTime: playbackStateCurrentTime, playbackRate, volume, isMuted },
    { setIsPlaying, setPlaybackRate, setVolume, setIsMuted }
  ] = playbackState;

  // Track current time for native audio player
  const [nativeCurrentTime, setNativeCurrentTime] = useState(0);

  // Function to stop time tracking
  const stopNativeTimeTracking = useCallback(() => {
    if (timeUpdateIntervalRef.current) {
      clearInterval(timeUpdateIntervalRef.current);
      timeUpdateIntervalRef.current = null;
    }
  }, []);
  
  // Function to start time tracking for native audio
  const startNativeTimeTracking = useCallback(() => {
    stopNativeTimeTracking();
    if (nativeAudioRef.current) {
      timeUpdateIntervalRef.current = setInterval(() => {
        if (nativeAudioRef.current && isUsingNativeAudio) {
          const newTime = nativeAudioRef.current.currentTime;
          if (!isNaN(newTime)) {
            setNativeCurrentTime(newTime);
          }
        }
      }, 50); 
    }
  }, [isUsingNativeAudio, stopNativeTimeTracking]);

  // Switch from Howler to native audio (can be called programmatically)
  const switchToNativeAudio = useCallback(() => {
    if (!file || isUsingNativeAudio) return;

    try {
      console.log('[HowlerPlayer] Switching to native HTML5 audio');
      
      if (nativeAudioRef.current && nativeAudioRef.current.src) {
        URL.revokeObjectURL(nativeAudioRef.current.src); // Clean up old src if exists
      }
      nativeAudioRef.current = createNativeAudioElement(file); // Recreate to ensure fresh state
      nativeAudioReadyRef.current = false; // Reset ready state

      nativeAudioRef.current.addEventListener('canplaythrough', () => {
          console.log('[HowlerPlayer] Native audio (switched) is ready to play through');
          nativeAudioReadyRef.current = true;
          if (nativeAudioRef.current) { // Check again as it might be null
            nativeAudioRef.current.playbackRate = playbackRate;
            // Fix: Type safe volume conversion
            // volume is number[] e.g. [50], native volume is 0-1
            const currentVolumeValue = Array.isArray(volume) && volume.length > 0 ? volume[0] / 100 : 0.5;
            nativeAudioRef.current.volume = currentVolumeValue;
            nativeAudioRef.current.muted = isMuted;

            if (playbackStateCurrentTime > 0 && isFinite(playbackStateCurrentTime)) {
                try {
                    nativeAudioRef.current.currentTime = playbackStateCurrentTime;
                    setNativeCurrentTime(playbackStateCurrentTime);
                } catch (err) {
                    console.warn('[HowlerPlayer] Could not set currentTime on native audio element:', err);
                }
            }
            if (isPlaying) {
                nativeAudioRef.current.play().catch(error => {
                    console.error('[HowlerPlayer] Error auto-playing native audio on switch:', error);
                    setIsPlaying(false); // Revert state if play fails
                });
            }
          }
      }, { once: true });
      
      nativeAudioRef.current.load(); // Important to load the new source

      setPlaybackErrors(null);
      setIsUsingNativeAudio(true);
      if (howl) { // Stop and unload Howler
          howl.stop();
          howl.unload();
      }
      setHowl(null); // Clear Howler instance
      
      startNativeTimeTracking(); // Ensure time tracking starts
      
    } catch (error) {
      console.error('[HowlerPlayer] Error switching to native audio:', error);
      setPlaybackErrors(`Error switching to native: ${String(error)}`);
    }
  }, [file, isUsingNativeAudio, playbackRate, volume, isMuted, setHowl, playbackStateCurrentTime, isPlaying, setIsPlaying, howl, startNativeTimeTracking]);

  const preTestAudio = async (file: File) => {
    // Pre-test the file to check compatibility
    if (file) {
      try {
        // Create a native audio fallback element
        if (nativeAudioRef.current && nativeAudioRef.current.src) { // Check if src exists before revoking
          URL.revokeObjectURL(nativeAudioRef.current.src);
        }
        nativeAudioRef.current = createNativeAudioElement(file);
        
        // Add event listener to detect when native audio is ready
        nativeAudioRef.current.addEventListener('canplaythrough', () => {
          console.log('[useHowlerPlayer] Native audio element is ready to play through');
          nativeAudioReadyRef.current = true;
          // Update duration when native audio is ready
          if (isUsingNativeAudio && nativeAudioRef.current) {
            const nativeDuration = nativeAudioRef.current.duration;
            if (!isNaN(nativeDuration) && nativeDuration > 0) {
              // Assuming coreState.duration is the source of truth for duration
              // This part needs to be handled carefully to not override Howler's duration if it's primary
              // For now, let getDuration handle this
            }
          }
        }, { once: true });
        
        // Test playback - this helps identify problem files early
        const testResult = await testAudioPlayback(file);
        return {
          canPlay: testResult.canPlay,
          needsHowler: !testResult.canPlay || testResult.needsAdvancedFeatures,
          error: testResult.error
        };
      } catch (error) {
        console.error('[useHowlerPlayer] Error in pre-test audio:', error);
        return {
          canPlay: false,
          needsHowler: true,
          error: String(error)
        };
      }
    }
    return {
      canPlay: false,
      needsHowler: true,
      error: 'No file provided'
    };
  };

  const safelyHandleError = (error: unknown): { name?: string; message?: string } => {
    if (error && typeof error === 'object') {
      return error as { name?: string; message?: string };
    }
    return { message: String(error) };
  };

  // Handle play errors with AudioContext resuming
  const handlePlayError = useCallback(async (id: number, error: any): Promise<boolean> => {
    if (!howl) return false;
    
    try {
      const errObj = safelyHandleError(error);
      
      const audioContext = Howler.ctx; // Use Howler's AudioContext
      if (audioContext && audioContext.state === 'suspended') {
        await audioContext.resume();
        console.log('[HowlerPlayer] AudioContext resumed');
        
        howl.play(id); // Try playing again after resuming
        return true;
      }
    } catch (resumeError) { // Renamed error variable
      const errObj = safelyHandleError(resumeError); // Use renamed variable
      
      if (errObj && errObj.name === 'AbortError') {
        console.log('[HowlerPlayer] AbortError detected - ignoring as this is expected with rapid interactions');
      } else {
        console.error('[HowlerPlayer] Error resuming AudioContext:', errObj.message);
      }
    }

    if (file && nativeAudioReadyRef.current && !isUsingNativeAudio) {
      console.log('[HowlerPlayer] Switching to native audio after playback error');
      switchToNativeAudio();
      return true;
    }

    const errorMessage = typeof error === 'string' ? error : `Playback failed: ${error?.message || error}`;
    setPlaybackErrors(errorMessage);
    if (onError) onError(errorMessage);
    return false;
  }, [howl, file, onError, isUsingNativeAudio, switchToNativeAudio]);

  // Switch from native to Howler (can be called programmatically)
  const switchToHowler = useCallback(() => {
    if (!file || !isUsingNativeAudio) return;
    
    try {
      console.log('[HowlerPlayer] Switching to Howler audio');
      
      stopNativeTimeTracking();
      
      const wasPlaying = isPlaying;
      const currentPosition = nativeAudioRef.current?.currentTime || 0;
      
      if (nativeAudioRef.current) {
        nativeAudioRef.current.pause();
      }
      
      setIsUsingNativeAudio(false); // This will trigger useAudioCore to load the file for Howler
      
      // The useAudioCore hook will set up Howler. We need to wait for it to be ready.
      // This is handled by the useEffect that syncs isPlaying with the player state.
      // We can prime the playbackStateCurrentTime from native if needed,
      // but useAudioCore will create a new Howl instance.
      // Seeking and playing will be handled by the sync useEffect.

      // After setIsUsingNativeAudio(false), useAudioCore will load the file.
      // When coreState.howl becomes available and coreState.isReady is true,
      // we need to restore playback state. This is tricky because coreState changes.
      // A useEffect watching coreState.isReady and !isUsingNativeAudio could handle this.
      // For now, assume useAudioCore handles initial state setup based on the file prop.
      // Re-triggering play if `wasPlaying` might be needed in a separate effect.

    } catch (error) {
      console.error('[HowlerPlayer] Error switching to Howler audio:', error);
      setPlaybackErrors(`Error switching to Howler: ${String(error)}`);
      setIsUsingNativeAudio(true); // Fallback to native if switch fails
    }
  }, [file, isUsingNativeAudio, isPlaying, stopNativeTimeTracking]);

  useEffect(() => {
    if (howl) {
      howl.on('playerror', handlePlayError);
      
      return () => {
        if (howl && typeof howl.off === 'function') { // Check if howl is still valid
            howl.off('playerror', handlePlayError);
        }
      };
    }
  }, [howl, handlePlayError]);

  // Initial file load - decide whether to use native or Howler
  useEffect(() => {
    if (!file) return;
    
    // Initialize native audio reference
    if (!nativeAudioRef.current) {
      nativeAudioRef.current = new Audio();
    }
    
    // If we should prefer native audio, test it first
    if (preferNative) {
      preTestAudio(file).then(result => {
        if (result.canPlay && !result.needsHowler) {
          // File can play natively, use native audio
          setIsUsingNativeAudio(true);
          // nativeAudioReadyRef.current = true; // This is set by 'canplaythrough' in preTestAudio
          console.log('[HowlerPlayer] Using native audio as primary player');
          
          // Set up native audio (src is already set in preTestAudio)
          // const audioUrl = URL.createObjectURL(file); // Already done in preTestAudio
          // nativeAudioRef.current!.src = audioUrl;
          nativeAudioRef.current!.load();
          
          startNativeTimeTracking();
          
        } else {
          // File needs Howler features or can't play natively
          setIsUsingNativeAudio(false);
          console.log('[HowlerPlayer] Using Howler as primary player (pre-test failed or prefers Howler features)');
          stopNativeTimeTracking();
        }
      });
    } else {
      // We prefer Howler, but still set up native as fallback by calling preTestAudio
      setIsUsingNativeAudio(false);
      preTestAudio(file); // This sets up nativeAudioRef.current
      stopNativeTimeTracking();
    }
    
    return () => {
      stopNativeTimeTracking();
      // coreState.howl unload is handled by useAudioCore
      // nativeAudioRef cleanup is handled by its own useEffect below
    };
  }, [file, preferNative, startNativeTimeTracking, stopNativeTimeTracking]); // Added start/stop tracking to deps

  // Set up native audio event listeners
  useEffect(() => {
    if (!isUsingNativeAudio || !nativeAudioRef.current) return;
    
    const localNativeAudioRef = nativeAudioRef.current; 

    const handleEnded = () => {
      setIsPlaying(false);
      if (onEnded) onEnded();
    };
    
    const handlePlay = () => {
      setIsPlaying(true);
      if (onPlayingChange) onPlayingChange(true);
      startNativeTimeTracking(); 
    };
    
    const handlePause = () => {
      setIsPlaying(false);
      if (onPlayingChange) onPlayingChange(false);
      stopNativeTimeTracking(); 
    };
    
    const handleTimeUpdate = () => {
      if (localNativeAudioRef) {
        const newTime = localNativeAudioRef.currentTime;
        if (!isNaN(newTime)) {
          setNativeCurrentTime(newTime);
        }
      }
    };
    
    const handleLoadedMetadata = () => {
        if (localNativeAudioRef) {
            const nativeDuration = localNativeAudioRef.duration;
            if (!isNaN(nativeDuration) && nativeDuration > 0) {
                console.log(`[useHowlerPlayer] Native audio loadedmetadata, duration: ${nativeDuration}`);
            }
        }
    };

    localNativeAudioRef.addEventListener('ended', handleEnded);
    localNativeAudioRef.addEventListener('play', handlePlay);
    localNativeAudioRef.addEventListener('pause', handlePause);
    localNativeAudioRef.addEventListener('timeupdate', handleTimeUpdate); // Keep for redundancy, though interval also updates
    localNativeAudioRef.addEventListener('loadedmetadata', handleLoadedMetadata);
    localNativeAudioRef.addEventListener('seeking', handleTimeUpdate); 
    localNativeAudioRef.addEventListener('seeked', handleTimeUpdate); 
    
    return () => {
      if (localNativeAudioRef) {
        localNativeAudioRef.removeEventListener('ended', handleEnded);
        localNativeAudioRef.removeEventListener('play', handlePlay);
        localNativeAudioRef.removeEventListener('pause', handlePause);
        localNativeAudioRef.removeEventListener('timeupdate', handleTimeUpdate);
        localNativeAudioRef.removeEventListener('loadedmetadata', handleLoadedMetadata);
        localNativeAudioRef.removeEventListener('seeking', handleTimeUpdate);
        localNativeAudioRef.removeEventListener('seeked', handleTimeUpdate);
      }
    };
  }, [isUsingNativeAudio, onEnded, onPlayingChange, setIsPlaying, startNativeTimeTracking, stopNativeTimeTracking]); // Added start/stop tracking

  // Clean up native audio on unmount or file change
  useEffect(() => {
    const currentNativeAudioRef = nativeAudioRef.current; // Capture for cleanup
    return () => {
      stopNativeTimeTracking();
      
      if (currentNativeAudioRef) {
        currentNativeAudioRef.pause();
        if (currentNativeAudioRef.src) {
          URL.revokeObjectURL(currentNativeAudioRef.src);
        }
        // nativeAudioRef.current = null; // Avoid setting ref to null here if preTestAudio reuses it
      }
      // Resetting these states might be too aggressive if file object itself hasn't changed,
      // but only its usage context (e.g. switching preferred player type globally).
      // For now, assume file change means full reset.
      // setIsUsingNativeAudio(preferNative); // This is handled by initial load effect
      // nativeAudioReadyRef.current = false;
    };
  }, [file, stopNativeTimeTracking]); // Removed preferNative, its role is in initial setup

  // Use playback controls from core
  const controls = useCorePlaybackControls({
    howl: !isUsingNativeAudio ? howl : null,
    isPlaying,
    currentTime: playbackStateCurrentTime,
    duration: coreDuration,
    // Fix: Use type assertion for volume to match expected parameter type
    volume: volume as any, // Cast to any to resolve type incompatibilities
    isMuted,
    playbackRate,
    setIsPlaying,
    setIsMuted,
    // Fix: Use type assertion for setVolume to match expected parameter type
    setVolume: setVolume as any, // Cast to any to resolve type incompatibilities
    setPlaybackRate
  });

  const nativeAudioControls = useCallback(() => {
    // The structure should return functions consistent with PlaybackControls interface from core
    const getControls = () => {
        if (!nativeAudioRef.current) {
         // Return a compatible structure for type safety, though non-functional
         return {
            ...controls, // Spread Howler controls as a base, they have the right signature
            handlePlayPause: () => {
                if (!nativeAudioRef.current) return;
                if (nativeAudioRef.current.paused) nativeAudioRef.current.play().catch(e => {setPlaybackErrors(String(e)); setIsPlaying(false);}); else nativeAudioRef.current.pause();
            },
            handleSeek: (time: number) => {
                if (!nativeAudioRef.current) return;
                nativeAudioRef.current.currentTime = time; setNativeCurrentTime(time);
            },
            handleSkip: (direction: 'forward' | 'backward', amount: number = 10) => {
                if (!nativeAudioRef.current) return;
                const newTime = nativeAudioRef.current.currentTime + (direction === 'forward' ? amount : -amount);
                nativeAudioRef.current.currentTime = Math.max(0, Math.min(newTime, nativeAudioRef.current.duration || Infinity));
                setNativeCurrentTime(nativeAudioRef.current.currentTime);
            },
            handleToggleMute: () => {
                if (!nativeAudioRef.current) return;
                const newMuted = !nativeAudioRef.current.muted; nativeAudioRef.current.muted = newMuted; setIsMuted(newMuted);
            },
            handleVolumeChange: (newVolumeArray: number[]) => {
              if (!nativeAudioRef.current) return;
              try {
                // Fix: Use type-safe volume handling
                if (!Array.isArray(newVolumeArray) || newVolumeArray.length === 0 || !isFinite(newVolumeArray[0])) {
                  console.warn('[HowlerPlayer] Received invalid volume value, using default', newVolumeArray);
                  // Use default value if invalid
                  (setVolume as any)([50]);
                  nativeAudioRef.current.volume = 0.5;
                  return;
                }
                
                const volumeValue = Math.max(0, Math.min(100, newVolumeArray[0])) / 100;
                nativeAudioRef.current.volume = volumeValue;
                // Fix: Use type assertion to match expected parameter type
                (setVolume as any)(newVolumeArray);
              } catch (err) {
                console.warn('[HowlerPlayer] Error changing volume on native audio:', err);
              }
            },
            handlePlaybackRateChange: (rate: number) => {
                if (!nativeAudioRef.current) return;
                nativeAudioRef.current.playbackRate = rate; setPlaybackRate(rate);
            }
          };
        }
        return {
            ...controls,
            handlePlayPause: () => {
              if (!nativeAudioRef.current) return;
              try {
                if (nativeAudioRef.current.paused) {
                  nativeAudioRef.current.play().catch(err => {
                    console.error('[HowlerPlayer] Native audio play error:', err);
                    setPlaybackErrors(`Native audio error: ${err.message || 'Unknown error'}`);
                    setIsPlaying(false); 
                  });
                  // setIsPlaying(true); // Let event handlers manage this
                } else {
                  nativeAudioRef.current.pause();
                  // setIsPlaying(false); // Let event handlers manage this
                }
              } catch (err) {
                console.error('[HowlerPlayer] Error toggling native audio playback:', err);
              }
            },
            handleSeek: (time: number) => {
              if (!nativeAudioRef.current) return;
              try {
                const newTime = Math.max(0, Math.min(time, nativeAudioRef.current.duration || Infinity));
                nativeAudioRef.current.currentTime = newTime;
                setNativeCurrentTime(newTime); 
              } catch (err) {
                console.warn('[HowlerPlayer] Error seeking native audio:', err);
              }
            },
            handleSkip: (direction: 'forward' | 'backward', amount: number = 10) => {
              if (!nativeAudioRef.current) return;
              try {
                const currentPosition = nativeAudioRef.current.currentTime;
                const duration = nativeAudioRef.current.duration || 0;
                const skipAmount = direction === 'forward' ? amount : -amount;
                let newTime = currentPosition + skipAmount;
                newTime = Math.max(0, Math.min(newTime, duration));
                nativeAudioRef.current.currentTime = newTime;
                setNativeCurrentTime(newTime);
              } catch (err) {
                console.warn('[HowlerPlayer] Error skipping native audio:', err);
              }
            },
            handleToggleMute: () => {
              if (!nativeAudioRef.current) return;
              try {
                const newMuted = !nativeAudioRef.current.muted;
                nativeAudioRef.current.muted = newMuted;
                setIsMuted(newMuted);
              } catch (err) {
                console.warn('[HowlerPlayer] Error toggling mute on native audio:', err);
              }
            },
            handleVolumeChange: (newVolumeArray: number[]) => { // Expects number[] e.g. [50]
              if (!nativeAudioRef.current) return;
              try {
                const volumeValue = Math.max(0, Math.min(100, newVolumeArray[0])) / 100;
                nativeAudioRef.current.volume = volumeValue;
                setVolume(newVolumeArray); 
              } catch (err) {
                console.warn('[HowlerPlayer] Error changing volume on native audio:', err);
              }
            },
            handlePlaybackRateChange: (rate: number) => {
              if (!nativeAudioRef.current) return;
              try {
                nativeAudioRef.current.playbackRate = rate;
                setPlaybackRate(rate);
              } catch (err) {
                console.warn('[HowlerPlayer] Error changing playback rate on native audio:', err);
              }
            }
          };
    };
    return getControls();
  }, [controls, setIsPlaying, setIsMuted, setVolume, setPlaybackRate, setPlaybackErrors, setNativeCurrentTime]);

  const activeControls = isUsingNativeAudio ? nativeAudioControls() : controls;

  const getDuration = useCallback(() => {
    if (isUsingNativeAudio && nativeAudioRef.current) {
      const duration = nativeAudioRef.current.duration;
      return !isNaN(duration) && isFinite(duration) ? duration : 0;
    }
    return coreDuration && isFinite(coreDuration) ? coreDuration : 0;
  }, [isUsingNativeAudio, coreDuration]);

  const seekToTimestamp = useCallback((time: number) => {
    const targetTime = Math.max(0, time);
    if (isUsingNativeAudio && nativeAudioRef.current) {
      try {
        const duration = nativeAudioRef.current.duration;
        const newTime = isNaN(duration) ? targetTime : Math.min(targetTime, duration);
        nativeAudioRef.current.currentTime = newTime;
        setNativeCurrentTime(newTime);
      } catch (err) {
        console.warn('[HowlerPlayer] Error seeking native audio in seekToTimestamp:', err);
      }
    } else if (howl && isReady) {
        try {
            const duration = howl.duration();
            const newTime = duration ? Math.min(targetTime, duration) : targetTime;
            howl.seek(newTime);
        } catch (err) {
            console.warn('[HowlerPlayer] Error seeking Howler audio in seekToTimestamp:', err);
        }
    } else {
      console.warn('[useHowlerPlayer] Cannot seek to timestamp - no audio player available or ready');
    }
  }, [isUsingNativeAudio, howl, isReady, setNativeCurrentTime]);

  const handleVolumeUp = useCallback(() => {
    const currentVolumePercent = Array.isArray(volume) && volume.length > 0 && isFinite(volume[0]) 
      ? volume[0] 
      : 50; // Safe default
    const newVolumePercent = Math.min(100, currentVolumePercent + 5);
    // Fix: Use type assertion for volume handling
    (activeControls.handleVolumeChange as any)([newVolumePercent]);
  }, [volume, activeControls]);

  const handleVolumeDown = useCallback(() => {
    const currentVolumePercent = Array.isArray(volume) && volume.length > 0 && isFinite(volume[0]) 
      ? volume[0] 
      : 50; // Safe default
    const newVolumePercent = Math.max(0, currentVolumePercent - 5);
    // Fix: Use type assertion for volume handling
    (activeControls.handleVolumeChange as any)([newVolumePercent]);
  }, [volume, activeControls]);

  return {
    isPlaying,
    currentTime: isUsingNativeAudio ? nativeCurrentTime : playbackStateCurrentTime,
    duration: coreDuration,
    volume, // This is number[] from usePlaybackState e.g. [50]
    isMuted,
    playbackRate,
    playbackErrors,
    metadata,
    isLoading,
    isReady: (isUsingNativeAudio && nativeAudioReadyRef.current) || (!isUsingNativeAudio && isReady),
    isUsingNativeAudio,
    switchToNativeAudio,
    switchToHowler,
    ...activeControls, // Spread the appropriate controls based on mode
    setIsPlaying, // Expose setIsPlaying for external control if absolutely necessary
    seekToTimestamp,
    handleVolumeUp,
    handleVolumeDown
  };
};
