import { useState, useEffect, useCallback, useRef } from 'react';
import { AudioMetadata } from '@/types/audio';
import { useAudioCore } from './core/useAudioCore';
import { usePlaybackState } from './core/usePlaybackState';
import { usePlaybackControls as useCorePlaybackControls } from './core/usePlaybackControls'; // Renamed import to avoid conflict
import { createNativeAudioElement, testAudioPlayback } from '@/utils/audio-format-helper';
// Removed getMimeTypeFromFile as it's not directly used in this file after previous changes.
// If it was needed elsewhere, ensure it's exported from audio-format-helper.ts
import { toast } from 'sonner';

interface HowlerPlayerHookProps {
  file?: File;
  onEnded?: () => void;
  onError?: (error: string) => void;
  preservePlaybackOnBlur?: boolean;
  resumeOnFocus?: boolean;
  onPlayingChange?: (isPlaying: boolean) => void;
  preferNative?: boolean; // New option to prefer native audio
}

export const useHowlerPlayer = ({
  file,
  onEnded,
  onError,
  preservePlaybackOnBlur = true,
  resumeOnFocus = true,
  onPlayingChange,
  preferNative = true // Default to preferring native audio
}: HowlerPlayerHookProps) => {
  // Change error structure to a simple string for easier handling
  const [playbackErrors, setPlaybackErrors] = useState<string | null>(null);

  // Native HTML5 audio element
  const nativeAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isUsingNativeAudio, setIsUsingNativeAudio] = useState(preferNative);
  const nativeAudioReadyRef = useRef<boolean>(false);
  
  // Time update tracking for native audio
  const timeUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize metadata state (could be moved to its own hook if it grows)
  const [metadata, setMetadata] = useState<AudioMetadata | null>(null);

  // Create a pre-test function to check file compatibility
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

  // Core audio setup - manages Howl instance and file loading
  // Will only be used if we're not using native audio
  const [coreState, setHowl, coreSetPlaybackErrors] = useAudioCore({
    file: isUsingNativeAudio ? undefined : file,
    onEnded,
    onError: (error) => {
      if (onError) onError(error);
      setPlaybackErrors(error);
      
      if (nativeAudioReadyRef.current && !isUsingNativeAudio && file) {
        console.log('[useHowlerPlayer] Auto-switching to native audio after Howler error');
        switchToNativeAudio();
      }
    },
    forceHTML5: true 
  });

  // Playback state - manages play/pause, time tracking, volume, etc.
  const [
    { isPlaying, currentTime : playbackStateCurrentTime, playbackRate, volume, isMuted },
    { setIsPlaying, setPlaybackRate, setVolume, setIsMuted }
  ] = usePlaybackState({ // Renamed currentTime to avoid conflict
    howl: !isUsingNativeAudio ? coreState.howl : null
  });

  const [nativeCurrentTime, setNativeCurrentTime] = useState(0);

  // Playback controls - functions to control playback
  const controls = useCorePlaybackControls({ // Use renamed import
    howl: !isUsingNativeAudio ? coreState.howl : null,
    isPlaying,
    currentTime: playbackStateCurrentTime, // Use currentTime from usePlaybackState for Howler
    duration: coreState.duration,
    volume: Array.isArray(volume) ? volume[0] / 100 : (typeof volume === 'number' ? volume / 100 : 0.5),
    isMuted,
    playbackRate,
    setIsPlaying,
    setIsMuted,
    setVolume: (val: number) => setVolume([Math.round(val * 100)]),
    setPlaybackRate
  });

  // Utility function to safely handle errors
  const safelyHandleError = (error: unknown): { name?: string; message?: string } => {
    if (error && typeof error === 'object') {
      return error as { name?: string; message?: string };
    }
    return { message: String(error) };
  };

  // Handle play errors with AudioContext resuming
  const handlePlayError = useCallback(async (id: number, error: any): Promise<boolean> => {
    if (!coreState.howl) return false;
    
    try {
      const errObj = safelyHandleError(error);
      
      const audioContext = Howler.ctx; // Use Howler's AudioContext
      if (audioContext && audioContext.state === 'suspended') {
        await audioContext.resume();
        console.log('[HowlerPlayer] AudioContext resumed');
        
        coreState.howl.play(id); // Try playing again after resuming
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
  }, [coreState.howl, file, onError, isUsingNativeAudio]); // Added isUsingNativeAudio and onError

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
            const currentVolume = Array.isArray(volume) ? volume[0] / 100 : (typeof volume === 'number' ? volume / 100 : 0.5);
            nativeAudioRef.current.volume = currentVolume;
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
      if (coreState.howl) { // Stop and unload Howler
          coreState.howl.stop();
          coreState.howl.unload();
      }
      setHowl(null); // Clear Howler instance
      
      startNativeTimeTracking(); // Ensure time tracking starts
      
    } catch (error) {
      console.error('[HowlerPlayer] Error switching to native audio:', error);
      setPlaybackErrors(`Error switching to native: ${String(error)}`);
    }
  }, [file, isUsingNativeAudio, playbackRate, volume, isMuted, setHowl, playbackStateCurrentTime, isPlaying, setIsPlaying, coreState.howl]); // Added dependencies

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

    } catch (error) {
      console.error('[HowlerPlayer] Error switching to Howler audio:', error);
      setPlaybackErrors(`Error switching to Howler: ${String(error)}`);
      setIsUsingNativeAudio(true); // Fallback to native if switch fails
    }
  }, [file, isUsingNativeAudio, isPlaying]); // Removed coreState dependencies as it might be stale

  // Register error handler on howl instance
  useEffect(() => {
    if (coreState.howl) {
      coreState.howl.on('playerror', handlePlayError);
      
      return () => {
        if (coreState.howl && typeof coreState.howl.off === 'function') { // Check if howl is still valid
            coreState.howl.off('playerror', handlePlayError);
        }
      };
    }
  }, [coreState.howl, handlePlayError]);

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
          nativeAudioReadyRef.current = true;
          console.log('[HowlerPlayer] Using native audio as primary player');
          
          // Set up native audio
          const audioUrl = URL.createObjectURL(file);
          nativeAudioRef.current!.src = audioUrl;
          nativeAudioRef.current!.load();
          
          // Start time tracking for native audio
          startNativeTimeTracking();
          
        } else {
          // File needs Howler features or can't play natively
          setIsUsingNativeAudio(false);
          console.log('[HowlerPlayer] Using Howler as primary player (pre-test failed or prefers Howler features)');
          // Stop native time tracking if it was running
          stopNativeTimeTracking();
        }
      });
    } else {
      // We prefer Howler, but still set up native as fallback
      setIsUsingNativeAudio(false);
      preTestAudio(file);
      // Stop native time tracking if it was running
      stopNativeTimeTracking();
    }
    
    // Cleanup function
    return () => {
      // Stop time tracking
      stopNativeTimeTracking();
    };
  }, [file, preferNative]);
  
  // Function to start time tracking for native audio
  const startNativeTimeTracking = () => {
    // Clear any existing interval first
    stopNativeTimeTracking();
    
    // Set up a more frequent update interval (50ms = 20 updates per second) - IMPROVED FROM 100ms
    // This makes the interactive transcription more responsive
    if (nativeAudioRef.current) {
      timeUpdateIntervalRef.current = setInterval(() => {
        if (nativeAudioRef.current && isUsingNativeAudio) {
          const newTime = nativeAudioRef.current.currentTime;
          if (!isNaN(newTime)) {
            setNativeCurrentTime(newTime);
          }
        }
      }, 50); // Update 20 times per second for smoother experience (was 100ms)
    }
  };
  
  // Function to stop time tracking
  const stopNativeTimeTracking = () => {
    if (timeUpdateIntervalRef.current) {
      clearInterval(timeUpdateIntervalRef.current);
      timeUpdateIntervalRef.current = null;
    }
  };

  // Set up native audio event listeners
  useEffect(() => {
    if (!isUsingNativeAudio || !nativeAudioRef.current) return;
    
    const localNativeAudioRef = nativeAudioRef.current; // Capture ref for cleanup

    const handleEnded = () => {
      setIsPlaying(false);
      if (onEnded) onEnded();
    };
    
    const handlePlay = () => {
      setIsPlaying(true);
      if (onPlayingChange) onPlayingChange(true);
      startNativeTimeTracking(); // Ensure tracking starts on play
    };
    
    const handlePause = () => {
      setIsPlaying(false);
      if (onPlayingChange) onPlayingChange(false);
      stopNativeTimeTracking(); // Stop tracking on pause to save resources
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
                // This is where we could update a shared duration state if needed
                console.log(`[useHowlerPlayer] Native audio loadedmetadata, duration: ${nativeDuration}`);
            }
        }
    };

    localNativeAudioRef.addEventListener('ended', handleEnded);
    localNativeAudioRef.addEventListener('play', handlePlay);
    localNativeAudioRef.addEventListener('pause', handlePause);
    localNativeAudioRef.addEventListener('timeupdate', handleTimeUpdate);
    localNativeAudioRef.addEventListener('loadedmetadata', handleLoadedMetadata); // Get duration
    
    // Add seeking events to better track when audio position changes
    localNativeAudioRef.addEventListener('seeking', handleTimeUpdate); // Update time on seeking
    localNativeAudioRef.addEventListener('seeked', handleTimeUpdate); // Update time after seeked
    
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
  }, [isUsingNativeAudio, onEnded, onPlayingChange, setIsPlaying]);

  // Clean up native audio on unmount or file change
  useEffect(() => {
    return () => {
      stopNativeTimeTracking();
      
      if (nativeAudioRef.current) {
        nativeAudioRef.current.pause();
        if (nativeAudioRef.current.src) {
          URL.revokeObjectURL(nativeAudioRef.current.src);
        }
        nativeAudioRef.current = null;
      }
      setIsUsingNativeAudio(preferNative);
      nativeAudioReadyRef.current = false;
    };
  }, [file, preferNative]);

  // Custom native audio controls
  const nativeAudioControls = useCallback(() => {
    if (!nativeAudioRef.current || !isUsingNativeAudio) {
      // Return a compatible structure even if not fully functional to prevent errors
      return {
        ...controls, // Spread Howler controls as a base
        handlePlayPause: () => { // Implement specific native controls
          if (!nativeAudioRef.current) return;
          try {
            if (nativeAudioRef.current.paused) {
              nativeAudioRef.current.play().catch(err => {
                console.error('[HowlerPlayer] Native audio play error:', err);
                setPlaybackErrors(`Native audio error: ${err.message || 'Unknown error'}`);
                setIsPlaying(false); // Revert if play fails
              });
              setIsPlaying(true); // Optimistically update UI
            } else {
              nativeAudioRef.current.pause();
              setIsPlaying(false); // Optimistically update UI
            }
          } catch (err) {
            console.error('[HowlerPlayer] Error toggling native audio playback:', err);
          }
        },
        handleSeek: (time: number) => {
          if (!nativeAudioRef.current) return;
          try {
            const newTime = Math.max(0, Math.min(time, nativeAudioRef.current.duration || Infinity));
            console.log(`[HowlerPlayer] Native seeking to ${newTime.toFixed(2)}s`);
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
            
            console.log(`[HowlerPlayer] Native skipping ${direction} to ${newTime.toFixed(2)}s (from ${currentPosition.toFixed(2)}s)`);
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
        handleVolumeChange: (newVolumeArray: number[]) => { // Expects array like [50]
          if (!nativeAudioRef.current) return;
          try {
            const volumeValue = newVolumeArray[0] / 100;
            nativeAudioRef.current.volume = Math.max(0, Math.min(1, volumeValue));
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
    }
    // This is the normal path when native audio is active and ready
    return {
      ...controls, // Spread Howler controls as a base
      handlePlayPause: () => {
        if (!nativeAudioRef.current) return;
        try {
          if (nativeAudioRef.current.paused) {
            nativeAudioRef.current.play().catch(err => {
              console.error('[HowlerPlayer] Native audio play error:', err);
              setPlaybackErrors(`Native audio error: ${err.message || 'Unknown error'}`);
              setIsPlaying(false); // Revert if play fails
            });
            setIsPlaying(true); // Optimistically update UI
          } else {
            nativeAudioRef.current.pause();
            setIsPlaying(false); // Optimistically update UI
          }
        } catch (err) {
          console.error('[HowlerPlayer] Error toggling native audio playback:', err);
        }
      },
      handleSeek: (time: number) => {
        if (!nativeAudioRef.current) return;
        try {
          const newTime = Math.max(0, Math.min(time, nativeAudioRef.current.duration || Infinity));
          console.log(`[HowlerPlayer] Native seeking to ${newTime.toFixed(2)}s`);
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
          
          console.log(`[HowlerPlayer] Native skipping ${direction} to ${newTime.toFixed(2)}s (from ${currentPosition.toFixed(2)}s)`);
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
      handleVolumeChange: (newVolumeArray: number[]) => {
        if (!nativeAudioRef.current) return;
        try {
          const volumeValue = newVolumeArray[0] / 100; // Assuming array [0-100]
          nativeAudioRef.current.volume = Math.max(0, Math.min(1, volumeValue));
          setVolume(newVolumeArray); // setVolume expects array e.g. [50]
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
  }, [isUsingNativeAudio, controls, setIsPlaying, setIsMuted, setVolume, setPlaybackRate, setPlaybackErrors]); // Added setPlaybackErrors

  // Get the active controls based on current mode
  const activeControls = isUsingNativeAudio ? nativeAudioControls() : controls;

  // Use native audio duration or howler duration
  const getDuration = useCallback(() => {
    if (isUsingNativeAudio && nativeAudioRef.current) {
      const duration = nativeAudioRef.current.duration;
      return !isNaN(duration) && isFinite(duration) ? duration : 0; // Return 0 if NaN or Infinite
    }
    // Ensure coreState.duration is a valid number, otherwise default to 0
    return coreState.duration && isFinite(coreState.duration) ? coreState.duration : 0;
  }, [isUsingNativeAudio, coreState.duration]);

  // Define seekToTimestamp function that was referenced in other components
  const seekToTimestamp = useCallback((time: number) => {
    const targetTime = Math.max(0, time); // Ensure time is not negative
    if (isUsingNativeAudio && nativeAudioRef.current) {
      try {
        const duration = nativeAudioRef.current.duration;
        const newTime = isNaN(duration) ? targetTime : Math.min(targetTime, duration);
        console.log(`[HowlerPlayer] Native seekToTimestamp: ${newTime.toFixed(2)}s`);
        nativeAudioRef.current.currentTime = newTime;
        setNativeCurrentTime(newTime);
      } catch (err) {
        console.warn('[HowlerPlayer] Error seeking native audio in seekToTimestamp:', err);
      }
    } else if (coreState.howl && coreState.isReady) {
        try {
            const duration = coreState.howl.duration();
            const newTime = duration ? Math.min(targetTime, duration) : targetTime;
            console.log(`[HowlerPlayer] Howler seekToTimestamp: ${newTime.toFixed(2)}s`);
            coreState.howl.seek(newTime);
            // Howler's seek event should update playbackStateCurrentTime via usePlaybackState
        } catch (err) {
            console.warn('[HowlerPlayer] Error seeking Howler audio in seekToTimestamp:', err);
        }
    } else {
      console.warn('[useHowlerPlayer] Cannot seek to timestamp - no audio player available or ready');
    }
  }, [isUsingNativeAudio, coreState.howl, coreState.isReady]);

  // Handle volume up/down functions (add these for compatibility)
  const handleVolumeUp = useCallback(() => {
    const currentVolumePercent = Array.isArray(volume) ? volume[0] : (typeof volume === 'number' ? volume : 50);
    const newVolumePercent = Math.min(100, currentVolumePercent + 5);
    activeControls.handleVolumeChange([newVolumePercent]);
  }, [volume, activeControls]);

  const handleVolumeDown = useCallback(() => {
    const currentVolumePercent = Array.isArray(volume) ? volume[0] : (typeof volume === 'number' ? volume : 50);
    const newVolumePercent = Math.max(0, currentVolumePercent - 5);
    activeControls.handleVolumeChange([newVolumePercent]);
  }, [volume, activeControls]);

  return {
    isPlaying,
    currentTime: isUsingNativeAudio ? nativeCurrentTime : playbackStateCurrentTime,
    duration: getDuration(),
    volume, // This is number[] from usePlaybackState e.g. [50]
    isMuted,
    playbackRate,
    playbackErrors,
    metadata, // Not fully implemented, but here for structure
    isLoading: coreState.isLoading,
    isReady: (isUsingNativeAudio && nativeAudioReadyRef.current) || (!isUsingNativeAudio && coreState.isReady),
    isUsingNativeAudio,
    switchToNativeAudio, // For switching to native audio
    switchToHowler, // For switching back to Howler if needed
    ...activeControls, // Spread the appropriate controls based on mode
    setIsPlaying,
    seekToTimestamp, // Add the seekToTimestamp function
    handleVolumeUp,
    handleVolumeDown
  };
};
