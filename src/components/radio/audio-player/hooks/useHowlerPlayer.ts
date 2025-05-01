
import { useState, useEffect, useCallback, useRef } from 'react';
import { AudioMetadata } from '@/types/audio';
import { useAudioCore } from './core/useAudioCore';
import { usePlaybackState } from './core/usePlaybackState';
import { usePlaybackControls } from './core/usePlaybackControls';
import { createNativeAudioElement, getMimeTypeFromFile, testAudioPlayback } from '@/utils/audio-format-helper';

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

  // Initialize metadata state (could be moved to its own hook if it grows)
  const [metadata, setMetadata] = useState<AudioMetadata | null>(null);

  // Create a pre-test function to check file compatibility
  const preTestAudio = async (file: File) => {
    // Pre-test the file to check compatibility
    if (file) {
      // Create a native audio fallback element
      if (nativeAudioRef.current) {
        URL.revokeObjectURL(nativeAudioRef.current.src);
      }
      nativeAudioRef.current = createNativeAudioElement(file);
      
      // Test playback - this helps identify problem files early
      const testResult = await testAudioPlayback(file);
      if (!testResult.canPlay) {
        console.warn(`[useHowlerPlayer] Audio pre-test failed: ${testResult.error}`);
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

    // If the AudioContext couldn't be resumed, or it wasn't the issue, return false
    const errorMessage = typeof error === 'string' ? error : `Playback failed: ${error?.message || error}`;
    setPlaybackErrors(errorMessage);
    return false;
  }, [coreState.howl]);

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
      nativeAudioRef.current.playbackRate = playbackRate;
      
      // Set native audio to current volume
      const volumeValue = Array.isArray(volume) ? volume[0] / 100 : volume;
      nativeAudioRef.current.volume = volumeValue / 100;
      
      // Set muted state
      nativeAudioRef.current.muted = isMuted;
      
      // Reset error state
      setPlaybackErrors(null);
      
      // Flag that we're using native audio
      setIsUsingNativeAudio(true);
      
      // Clear Howler instance to avoid conflicts
      setHowl(null);
      
    } catch (error) {
      console.error('[HowlerPlayer] Error switching to native audio:', error);
    }
  }, [file, isUsingNativeAudio, playbackRate, volume, isMuted, setHowl]);

  // Register error handler on howl instance
  useEffect(() => {
    if (coreState.howl) {
      coreState.howl.on('playerror', handlePlayError);
      
      return () => {
        coreState.howl.off('playerror');
      };
    }
  }, [coreState.howl, handlePlayError]);

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
    };
  }, [file]);

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
        } else {
          nativeAudioRef.current.pause();
          setIsPlaying(false);
        }
      },
      handleSeek: (time: number) => {
        if (!nativeAudioRef.current) return;
        nativeAudioRef.current.currentTime = time;
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
  }, [isUsingNativeAudio, controls, setIsPlaying, setIsMuted, setVolume, setPlaybackRate]);

  // Get the active controls based on current mode
  const activeControls = isUsingNativeAudio ? nativeAudioControls() || controls : controls;

  // Define seekToTimestamp function that was referenced in other components
  const seekToTimestamp = useCallback((time: number) => {
    if (isUsingNativeAudio && nativeAudioRef.current) {
      nativeAudioRef.current.currentTime = time;
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
  };

  const handleVolumeDown = () => {
    const newVolume = Math.max(0, volume[0] - 5);
    setVolume([newVolume]);
  };

  return {
    isPlaying,
    currentTime,
    duration: isUsingNativeAudio && nativeAudioRef.current ? 
              nativeAudioRef.current.duration : 
              coreState.duration,
    volume,
    isMuted,
    playbackRate,
    playbackErrors,
    metadata,
    isLoading: coreState.isLoading,
    isReady: coreState.isReady,
    isUsingNativeAudio,
    switchToNativeAudio, // Expose this method so error components can trigger fallback
    ...activeControls, // Spread the appropriate controls based on mode
    setIsPlaying,
    seekToTimestamp, // Add the seekToTimestamp function
    handleVolumeUp,
    handleVolumeDown
  };
};
