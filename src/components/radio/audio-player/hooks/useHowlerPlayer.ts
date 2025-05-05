import { useState, useEffect, useCallback, useRef } from 'react';
import { AudioMetadata } from '@/types/audio';
import { useAudioCore } from './core/useAudioCore';
import { usePlaybackState } from './core/usePlaybackState';
import { usePlaybackControls } from './core/usePlaybackControls';
import { createNativeAudioElement, getMimeTypeFromFile, testAudioPlayback } from '@/utils/audio-format-helper';
import { toast } from 'sonner';

interface HowlerPlayerHookProps {
  file?: File;
  onEnded?: () => void;
  onError?: (error: string) => void;
  preservePlaybackOnBlur?: boolean;
  resumeOnFocus?: boolean;
  onPlayingChange?: (isPlaying: boolean) => void;
  preferNative?: boolean; // New option to prefer native audio
  initialTime?: number; // New prop for restoring playback position
}

export const useHowlerPlayer = ({
  file,
  onEnded,
  onError,
  preservePlaybackOnBlur = true,
  resumeOnFocus = true,
  onPlayingChange,
  preferNative = true, // Default to preferring native audio
  initialTime
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
        if (nativeAudioRef.current) {
          URL.revokeObjectURL(nativeAudioRef.current.src);
        }
        nativeAudioRef.current = createNativeAudioElement(file);
        
        // Add event listener to detect when native audio is ready
        nativeAudioRef.current.addEventListener('canplaythrough', () => {
          console.log('[useHowlerPlayer] Native audio element is ready to play through');
          nativeAudioReadyRef.current = true;
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
      
      // If we get an error and native audio is ready, auto-switch to native
      if (nativeAudioReadyRef.current && !isUsingNativeAudio) {
        console.log('[useHowlerPlayer] Auto-switching to native audio after Howler error');
        switchToNativeAudio();
      }
    },
    forceHTML5: true // Force HTML5 Audio playback
  });

  // Playback state - manages play/pause, time tracking, volume, etc.
  const [
    { isPlaying, currentTime, playbackRate, volume, isMuted },
    { setIsPlaying, setPlaybackRate, setVolume, setIsMuted }
  ] = usePlaybackState({
    howl: !isUsingNativeAudio ? coreState.howl : null
  });

  // Track current time for native audio player
  const [nativeCurrentTime, setCurrentTime] = useState(0);

  // Playback controls - functions to control playback
  const controls = usePlaybackControls({
    howl: !isUsingNativeAudio ? coreState.howl : null,
    isPlaying,
    currentTime,
    duration: coreState.duration,
    volume: Array.isArray(volume) ? volume[0] / 100 : volume / 100, // Convert to normalized value for controls
    isMuted,
    playbackRate,
    setIsPlaying,
    setIsMuted,
    setVolume: (val: number) => setVolume([val * 100]), // Convert number to array
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
      
      const audioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (audioContext && audioContext.state === 'suspended') {
        await audioContext.resume();
        console.log('[HowlerPlayer] AudioContext resumed');
        
        // Try playing again after resuming
        await coreState.howl.play(id);
        return true;
      }
    } catch (error) {
      const errObj = safelyHandleError(error);
      
      // Special handling for AbortError - common during rapid play/pause
      if (errObj && errObj.name === 'AbortError') {
        console.log('[HowlerPlayer] AbortError detected - ignoring as this is expected with rapid interactions');
      } else {
        // Log the error for debugging
        console.error('[HowlerPlayer] Error resuming AudioContext:', errObj.message);
      }
    }

    // If the AudioContext couldn't be resumed, or it wasn't the issue
    // Check if we should switch to native audio
    if (file && nativeAudioReadyRef.current) {
      console.log('[HowlerPlayer] Switching to native audio after playback error');
      switchToNativeAudio();
      return true;
    }

    const errorMessage = typeof error === 'string' ? error : `Playback failed: ${error?.message || error}`;
    setPlaybackErrors(errorMessage);
    return false;
  }, [coreState.howl, file]);

  // Switch from Howler to native audio (can be called programmatically)
  const switchToNativeAudio = useCallback(() => {
    if (!file || isUsingNativeAudio) return;

    try {
      console.log('[HowlerPlayer] Switching to native HTML5 audio');
      
      // Create a native audio element if needed
      if (!nativeAudioRef.current) {
        nativeAudioRef.current = createNativeAudioElement(file);
      }
      
      // Set to current playback rate
      if (nativeAudioRef.current.playbackRate !== playbackRate) {
        nativeAudioRef.current.playbackRate = playbackRate;
      }
      
      // Set native audio to current volume
      const volumeValue = Array.isArray(volume) ? volume[0] / 100 : volume / 100;
      nativeAudioRef.current.volume = volumeValue;
      
      // Set muted state
      nativeAudioRef.current.muted = isMuted;
      
      // Reset error state
      setPlaybackErrors(null);
      
      // Flag that we're using native audio
      setIsUsingNativeAudio(true);
      
      // Clear Howler instance to avoid conflicts
      setHowl(null);
      
      // Set up native event listeners
      nativeAudioRef.current.addEventListener('play', () => {
        setIsPlaying(true);
        if (onPlayingChange) onPlayingChange(true);
      });
      
      nativeAudioRef.current.addEventListener('pause', () => {
        setIsPlaying(false);
        if (onPlayingChange) onPlayingChange(false);
      });
      
      nativeAudioRef.current.addEventListener('ended', () => {
        setIsPlaying(false);
        if (onEnded) onEnded();
      });
      
      // Preserve current playback position if available
      if (currentTime > 0 && isFinite(currentTime)) {
        try {
          nativeAudioRef.current.currentTime = currentTime;
        } catch (err) {
          console.warn('[HowlerPlayer] Could not set currentTime on native audio element:', err);
        }
      }
      
      // Start time tracking for native audio
      startNativeTimeTracking();
      
      // Auto-play if we were previously playing
      if (isPlaying) {
        nativeAudioRef.current.play().catch(error => {
          console.error('[HowlerPlayer] Error auto-playing native audio:', error);
        });
      }
      
    } catch (error) {
      console.error('[HowlerPlayer] Error switching to native audio:', error);
    }
  }, [file, isUsingNativeAudio, playbackRate, volume, isMuted, setHowl, currentTime, isPlaying, onEnded, setIsPlaying, onPlayingChange]);

  // Switch from native to Howler (can be called programmatically)
  const switchToHowler = useCallback(() => {
    if (!file || !isUsingNativeAudio) return;
    
    try {
      console.log('[HowlerPlayer] Switching to Howler audio');
      
      // Stop native time tracking
      stopNativeTimeTracking();
      
      // Save current playback state
      const wasPlaying = isPlaying;
      const currentPosition = nativeAudioRef.current?.currentTime || 0;
      
      // Stop native audio
      if (nativeAudioRef.current) {
        nativeAudioRef.current.pause();
      }
      
      // Switch state first so useAudioCore will load the file
      setIsUsingNativeAudio(false);
      
      // When Howler is ready, restore state
      const checkHowlerReady = setInterval(() => {
        if (coreState.howl && coreState.isReady) {
          clearInterval(checkHowlerReady);
          
          // Set position
          if (currentPosition > 0) {
            coreState.howl.seek(currentPosition);
          }
          
          // Resume playing if needed
          if (wasPlaying) {
            coreState.howl.play();
          }
        }
      }, 100);
      
      // Clean up interval after max 5 seconds
      setTimeout(() => {
        clearInterval(checkHowlerReady);
      }, 5000);
      
    } catch (error) {
      console.error('[HowlerPlayer] Error switching to Howler audio:', error);
      // If switching to Howler fails, go back to native
      setIsUsingNativeAudio(true);
    }
  }, [file, isUsingNativeAudio, isPlaying, coreState.howl, coreState.isReady]);

  // Register error handler on howl instance
  useEffect(() => {
    if (coreState.howl) {
      coreState.howl.on('playerror', handlePlayError);
      
      return () => {
        coreState.howl.off('playerror');
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
          console.log('[HowlerPlayer] Using Howler as primary player');
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
    
    // Set up a more frequent update interval (100ms = 10 updates per second)
    // This should make the interactive transcription more responsive
    if (nativeAudioRef.current) {
      timeUpdateIntervalRef.current = setInterval(() => {
        if (nativeAudioRef.current && isUsingNativeAudio) {
          const newTime = nativeAudioRef.current.currentTime;
          if (!isNaN(newTime)) {
            setCurrentTime(newTime);
          }
        }
      }, 100); // Update 10 times per second for smoother experience
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
    
    const handleEnded = () => {
      setIsPlaying(false);
      if (onEnded) onEnded();
    };
    
    const handlePlay = () => {
      setIsPlaying(true);
      if (onPlayingChange) onPlayingChange(true);
    };
    
    const handlePause = () => {
      setIsPlaying(false);
      if (onPlayingChange) onPlayingChange(false);
    };
    
    const nativeAudio = nativeAudioRef.current;
    nativeAudio.addEventListener('ended', handleEnded);
    nativeAudio.addEventListener('play', handlePlay);
    nativeAudio.addEventListener('pause', handlePause);
    
    // Also add timeupdate event for more accurate time tracking
    const handleTimeUpdate = () => {
      if (nativeAudioRef.current) {
        setCurrentTime(nativeAudioRef.current.currentTime);
      }
    };
    nativeAudio.addEventListener('timeupdate', handleTimeUpdate);
    
    return () => {
      if (nativeAudio) {
        nativeAudio.removeEventListener('ended', handleEnded);
        nativeAudio.removeEventListener('play', handlePlay);
        nativeAudio.removeEventListener('pause', handlePause);
        nativeAudio.removeEventListener('timeupdate', handleTimeUpdate);
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
    if (!nativeAudioRef.current || !isUsingNativeAudio) return;
    
    // Create enhanced controls that mimic the interface of our regular controls
    const enhancedControls = {
      ...controls,
      handlePlayPause: () => {
        if (!nativeAudioRef.current) return;
        
        try {
          if (nativeAudioRef.current.paused) {
            nativeAudioRef.current.play().catch(err => {
              console.error('[HowlerPlayer] Native audio play error:', err);
              setPlaybackErrors(`Native audio error: ${err.message || 'Unknown error'}`);
            });
          } else {
            nativeAudioRef.current.pause();
          }
        } catch (err) {
          console.error('[HowlerPlayer] Error toggling native audio playback:', err);
        }
      },
      handleSeek: (time: number) => {
        if (!nativeAudioRef.current) return;
        try {
          nativeAudioRef.current.currentTime = time;
          setCurrentTime(time);
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
          const newTime = Math.max(0, Math.min(currentPosition + skipAmount, duration));
          nativeAudioRef.current.currentTime = newTime;
          setCurrentTime(newTime);
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
      handleVolumeChange: (newVolume: number[]) => {
        if (!nativeAudioRef.current) return;
        try {
          // Convert array volume to a single normalized value
          const volumeValue = newVolume[0] / 100;
          nativeAudioRef.current.volume = volumeValue;
          setVolume(newVolume);
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
    
    return enhancedControls;
  }, [isUsingNativeAudio, controls, setIsPlaying, setIsMuted, setVolume, setPlaybackRate]);

  // Get the active controls based on current mode
  const activeControls = isUsingNativeAudio ? nativeAudioControls() || controls : controls;

  // Use native audio duration or howler duration
  const getDuration = useCallback(() => {
    if (isUsingNativeAudio && nativeAudioRef.current) {
      const duration = nativeAudioRef.current.duration;
      return !isNaN(duration) ? duration : coreState.duration;
    }
    return coreState.duration;
  }, [isUsingNativeAudio, coreState.duration]);

  // Define seekToTimestamp function that was referenced in other components
  const seekToTimestamp = useCallback((time: number) => {
    if (isUsingNativeAudio && nativeAudioRef.current) {
      try {
        nativeAudioRef.current.currentTime = time;
        setCurrentTime(time);
      } catch (err) {
        console.warn('[HowlerPlayer] Error seeking native audio:', err);
      }
    } else if (coreState.howl) {
      coreState.howl.seek(time);
    } else {
      console.warn('[useHowlerPlayer] Cannot seek to timestamp - no audio player available');
    }
  }, [isUsingNativeAudio, coreState.howl]);

  // Handle volume up/down functions (add these for compatibility)
  const handleVolumeUp = () => {
    const newVolume = Math.min(100, volume[0] + 5);
    setVolume([newVolume]);
    
    // Also update native audio if that's what we're using
    if (isUsingNativeAudio && nativeAudioRef.current) {
      nativeAudioRef.current.volume = newVolume / 100;
    }
  };

  const handleVolumeDown = () => {
    const newVolume = Math.max(0, volume[0] - 5);
    setVolume([newVolume]);
    
    // Also update native audio if that's what we're using
    if (isUsingNativeAudio && nativeAudioRef.current) {
      nativeAudioRef.current.volume = newVolume / 100;
    }
  };

  // Add effect to apply initial time
  useEffect(() => {
    if (initialTime && initialTime > 0 && isFinite(initialTime) && isReady && !initialTimeApplied.current) {
      console.log(`[useHowlerPlayer] Setting initial time to ${initialTime.toFixed(2)}`);
      
      if (isUsingNativeAudio && nativeAudioRef.current) {
        try {
          nativeAudioRef.current.currentTime = initialTime;
          initialTimeApplied.current = true;
        } catch (err) {
          console.warn('[useHowlerPlayer] Could not set initialTime on native audio:', err);
        }
      } else if (coreState.howl) {
        try {
          coreState.howl.seek(initialTime);
          initialTimeApplied.current = true;
        } catch (err) {
          console.warn('[useHowlerPlayer] Could not set initialTime on howler:', err);
        }
      }
    }
  }, [initialTime, isReady, isUsingNativeAudio, coreState.howl]);
  
  // Reset the initialTimeApplied flag when file changes
  useEffect(() => {
    initialTimeApplied.current = false;
  }, [file]);

  return {
    isPlaying,
    currentTime: isUsingNativeAudio ? nativeCurrentTime : currentTime,
    duration: getDuration(),
    volume,
    isMuted,
    playbackRate,
    playbackErrors,
    metadata,
    isLoading: coreState.isLoading,
    isReady: coreState.isReady || (isUsingNativeAudio && nativeAudioReadyRef.current),
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
