
import { useState, useEffect, useCallback } from 'react';
import { AudioMetadata } from '@/types/audio';
import { useAudioCore } from './core/useAudioCore';
import { usePlaybackState } from './core/usePlaybackState';
import { usePlaybackControls } from './core/usePlaybackControls';

interface HowlerPlayerHookProps {
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
}: HowlerPlayerHookProps) => {
  // Errors from playback
  const [playbackErrors, setPlaybackErrorsState] = useState<{
    howlerError: string | null;
    contextError: string | null;
  }>({
    howlerError: null,
    contextError: null
  });

  // Initialize metadata state (could be moved to its own hook if it grows)
  const [metadata, setMetadata] = useState<AudioMetadata | null>(null);

  // Core audio setup - manages Howl instance and file loading
  const [coreState, setHowl, setPlaybackErrors] = useAudioCore({
    file,
    onEnded,
    onError: (error) => {
      if (onError) onError(error);
      setPlaybackErrorsState(prev => ({ ...prev, howlerError: error }));
    }
  });

  // Playback state - manages play/pause, time tracking, volume, etc.
  const [
    { isPlaying, currentTime, playbackRate, volume, isMuted },
    { setIsPlaying, setPlaybackRate, setVolume, setIsMuted }
  ] = usePlaybackState({
    howl: coreState.howl
  });

  // Playback controls - functions to control playback
  const controls = usePlaybackControls({
    howl: coreState.howl,
    isPlaying,
    currentTime,
    duration: coreState.duration,
    volume,
    isMuted,
    playbackRate,
    setIsPlaying,
    setIsMuted,
    setVolume,
    setPlaybackRate
  });

  // Handle play errors with AudioContext resuming
  const handlePlayError = useCallback(async (id: number, error: any): Promise<boolean> => {
    if (!coreState.howl) return false;
    
    try {
      // Create a utility function to safely handle errors
      const handleErrors = (error: unknown): { name?: string; message?: string } => {
        if (error && typeof error === 'object') {
          return error as { name?: string; message?: string };
        }
        return { message: String(error) };
      };
      
      const audioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (audioContext && audioContext.state === 'suspended') {
        await audioContext.resume();
        console.log('[HowlerPlayer] AudioContext resumed');
        
        // Try playing again after resuming
        await coreState.howl.play(id);
        return true;
      }
    } catch (error) {
      const errObj = handleErrors(error);
      
      // Special handling for AbortError - common during rapid play/pause
      if (errObj && errObj.name === 'AbortError') {
        console.log('[HowlerPlayer] AbortError detected - ignoring as this is expected with rapid interactions');
      } else {
        // Log the error for debugging
        console.error('[HowlerPlayer] Error resuming AudioContext:', errObj.message);
      }
    }

    // If the AudioContext couldn't be resumed, or it wasn't the issue, return false
    setPlaybackErrors(prev => ({ ...prev, howlerError: `Playback failed: ${error}` }));
    return false;
  }, [coreState.howl, setPlaybackErrors]);

  // Register error handler on howl instance
  useEffect(() => {
    if (coreState.howl) {
      coreState.howl.on('playerror', handlePlayError);
      
      return () => {
        coreState.howl.off('playerror');
      };
    }
  }, [coreState.howl, handlePlayError]);

  return {
    isPlaying,
    currentTime,
    duration: coreState.duration,
    volume,
    isMuted,
    playbackRate,
    playbackErrors,
    metadata,
    isLoading: coreState.isLoading,
    isReady: coreState.isReady,
    ...controls,
    setIsPlaying
  };
};
