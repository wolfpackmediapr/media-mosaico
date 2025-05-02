
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
}

export const useHowlerPlayer = ({
  file,
  onEnded,
  onError,
  preservePlaybackOnBlur = true,
  resumeOnFocus = true,
  onPlayingChange
}: HowlerPlayerHookProps) => {
  // Change error structure to a simple string for easier handling
  const [playbackErrors, setPlaybackErrors] = useState<string | null>(null);

  // Native HTML5 audio fallback element
  const nativeAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isUsingNativeAudio, setIsUsingNativeAudio] = useState(false);
  const nativeAudioReadyRef = useRef<boolean>(false);

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
        if (!testResult.canPlay) {
          console.warn(`[useHowlerPlayer] Audio pre-test failed: ${testResult.error}`);
          return false;
        }
      } catch (error) {
        console.error('[useHowlerPlayer] Error in pre-test audio:', error);
        return false;
      }
    }
    return true;
  };

  // Core audio setup - manages Howl instance and file loading
  const [coreState, setHowl, coreSetPlaybackErrors] = useAudioCore({
    file,
    onEnded,
    onError: (error) => {
      if (onError) onError(error);
      setPlaybackErrors(error);
      
      // If we get an error and native audio is ready, auto-switch to it
      if (nativeAudioReadyRef.current) {
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

  // Native audio fallback logic
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
      nativeAudioRef.current.addEventListener('play', () => setIsPlaying(true));
      nativeAudioRef.current.addEventListener('pause', () => setIsPlaying(false));
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
      
      // Auto-play if we were previously playing
      if (isPlaying) {
        nativeAudioRef.current.play().catch(error => {
          console.error('[HowlerPlayer] Error auto-playing native audio:', error);
        });
      }
      
    } catch (error) {
      console.error('[HowlerPlayer] Error switching to native audio:', error);
    }
  }, [file, isUsingNativeAudio, playbackRate, volume, isMuted, setHowl, currentTime, isPlaying, onEnded, setIsPlaying]);

  // Register error handler on howl instance
  useEffect(() => {
    if (coreState.howl) {
      coreState.howl.on('playerror', handlePlayError);
      
      return () => {
        coreState.howl.off('playerror');
      };
    }
  }, [coreState.howl, handlePlayError]);

  // Set up native audio tracking if using native audio
  useEffect(() => {
    if (!isUsingNativeAudio || !nativeAudioRef.current) return;
    
    let timeUpdateInterval: NodeJS.Timeout | null = null;
    
    // Track current time when playing
    if (isPlaying) {
      timeUpdateInterval = setInterval(() => {
        if (nativeAudioRef.current) {
          const newTime = nativeAudioRef.current.currentTime;
          if (!isNaN(newTime)) {
            setCurrentTime(newTime);
          }
        }
      }, 250); // Update 4 times per second
    }
    
    const handleEnded = () => {
      setIsPlaying(false);
      if (onEnded) onEnded();
    };
    
    nativeAudioRef.current.addEventListener('ended', handleEnded);
    
    return () => {
      if (timeUpdateInterval) {
        clearInterval(timeUpdateInterval);
      }
      if (nativeAudioRef.current) {
        nativeAudioRef.current.removeEventListener('ended', handleEnded);
      }
    };
  }, [isUsingNativeAudio, isPlaying, onEnded, setIsPlaying]);

  // Track current time for native audio player
  const [nativeCurrentTime, setCurrentTime] = useState(0);

  // Clean up native audio on unmount or file change
  useEffect(() => {
    return () => {
      if (nativeAudioRef.current) {
        nativeAudioRef.current.pause();
        if (nativeAudioRef.current.src) {
          URL.revokeObjectURL(nativeAudioRef.current.src);
        }
        nativeAudioRef.current = null;
      }
      setIsUsingNativeAudio(false);
      nativeAudioReadyRef.current = false;
    };
  }, [file]);

  // Pre-test the audio when file changes
  useEffect(() => {
    if (file) {
      preTestAudio(file).then(canPlay => {
        if (!canPlay && !isUsingNativeAudio) {
          console.log('[HowlerPlayer] Pre-test indicates potential issues, preparing native fallback');
        }
      });
    }
  }, [file, isUsingNativeAudio]);

  // Custom native audio controls
  const nativeAudioControls = useCallback(() => {
    if (!nativeAudioRef.current || !isUsingNativeAudio) return;
    
    // Create enhanced controls that mimic the interface of our regular controls
    const enhancedControls = {
      ...controls,
      handlePlayPause: () => {
        if (!nativeAudioRef.current) return;
        
        if (nativeAudioRef.current.paused) {
          nativeAudioRef.current.play().catch(err => {
            console.error('[HowlerPlayer] Native audio play error:', err);
            setPlaybackErrors(`Native audio error: ${err.message || 'Unknown error'}`);
          });
          setIsPlaying(true);
          if (onPlayingChange) onPlayingChange(true);
        } else {
          nativeAudioRef.current.pause();
          setIsPlaying(false);
          if (onPlayingChange) onPlayingChange(false);
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
      handleToggleMute: () => {
        if (!nativeAudioRef.current) return;
        nativeAudioRef.current.muted = !nativeAudioRef.current.muted;
        setIsMuted(nativeAudioRef.current.muted);
      },
      handleVolumeChange: (newVolume: number[]) => {
        if (!nativeAudioRef.current) return;
        // Convert array volume to a single normalized value
        const volumeValue = newVolume[0] / 100;
        nativeAudioRef.current.volume = volumeValue;
        setVolume(newVolume);
      },
      handlePlaybackRateChange: (rate: number) => {
        if (!nativeAudioRef.current) return;
        nativeAudioRef.current.playbackRate = rate;
        setPlaybackRate(rate);
      }
    };
    
    return enhancedControls;
  }, [isUsingNativeAudio, controls, setIsPlaying, setIsMuted, setVolume, setPlaybackRate, onPlayingChange]);

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
    switchToNativeAudio, // Expose this method so error components can trigger fallback
    ...activeControls, // Spread the appropriate controls based on mode
    setIsPlaying,
    seekToTimestamp, // Add the seekToTimestamp function
    handleVolumeUp,
    handleVolumeDown
  };
};
