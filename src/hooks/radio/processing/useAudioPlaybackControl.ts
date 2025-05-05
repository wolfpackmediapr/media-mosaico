
import { useCallback, useRef, useEffect } from 'react';
import { RadioNewsSegment } from '@/components/radio/RadioNewsSegmentsContainer';

interface UseAudioPlaybackControlProps {
  isPlaying: boolean;
  playbackErrors: string | null;
  originalHandlePlayPause: () => void;
  seekToTimestamp: (time: number) => void;
}

export const useAudioPlaybackControl = ({
  isPlaying,
  playbackErrors,
  originalHandlePlayPause,
  seekToTimestamp
}: UseAudioPlaybackControlProps) => {
  // Use a ref to track if a seek operation is in progress
  const seekOperationInProgressRef = useRef<boolean>(false);
  // Use a ref to track the last seek time to avoid duplicate operations
  const lastSeekTimeRef = useRef<number>(0);
  // Track the last known play state to help with synchronization
  const lastPlayStateRef = useRef<boolean>(isPlaying);
  // Track the time of the last play/pause operation
  const lastPlayPauseTimeRef = useRef<number>(Date.now());

  // Update last play state ref when isPlaying changes
  useEffect(() => {
    // Log state changes to help with debugging
    if (lastPlayStateRef.current !== isPlaying) {
      console.log(`[useAudioPlaybackControl] Play state changed: ${isPlaying ? 'playing' : 'paused'}`);
    }
    
    lastPlayStateRef.current = isPlaying;
    
    // Clear any stuck seek operation flags after 400ms (reduced from 600ms)
    if (seekOperationInProgressRef.current) {
      const timeoutId = setTimeout(() => {
        if (seekOperationInProgressRef.current) {
          console.log('[useAudioPlaybackControl] Force clearing stuck seek operation flag');
          seekOperationInProgressRef.current = false;
        }
      }, 400);
      
      return () => clearTimeout(timeoutId);
    }
  }, [isPlaying]);

  // Enhanced play/pause handler with error checking and debouncing
  const handlePlayPause = useCallback(() => {
    // Check for errors that would prevent playback
    if (playbackErrors) {
      console.error('[useAudioPlaybackControl] Cannot play/pause due to errors:', playbackErrors);
      return;
    }
    
    // Prevent rapid multiple clicks (debounce)
    const now = Date.now();
    if (now - lastPlayPauseTimeRef.current < 150) {
      console.log('[useAudioPlaybackControl] Ignoring rapid play/pause request');
      return;
    }
    lastPlayPauseTimeRef.current = now;
    
    // Don't allow play/pause during seek operations
    if (seekOperationInProgressRef.current) {
      console.log('[useAudioPlaybackControl] Ignoring play/pause during seek operation');
      return;
    }
    
    try {
      console.log(`[useAudioPlaybackControl] Calling play/pause, current state: ${isPlaying ? 'playing' : 'paused'}`);
      originalHandlePlayPause();
    } catch (error) {
      console.error('[useAudioPlaybackControl] Error during play/pause:', error);
      // Force reset the seek flag in case of error
      seekOperationInProgressRef.current = false;
    }
  }, [playbackErrors, originalHandlePlayPause, isPlaying]);

  // Handler for seeking to a specific segment with improved error handling
  const handleSeekToSegment = useCallback((segment: RadioNewsSegment | number) => {
    if (playbackErrors) {
      console.error('[useAudioPlaybackControl] Cannot seek due to errors:', playbackErrors);
      return;
    }
    
    try {
      // Mark that a seek operation is in progress
      seekOperationInProgressRef.current = true;
      
      // Determine the timestamp to seek to
      const timestamp = typeof segment === 'number' 
        ? segment 
        : (segment.startTime / 1000); // Convert ms to seconds
      
      // Check if this is a duplicate seek operation (within 300ms - reduced from 500ms)
      const now = Date.now();
      if (Math.abs(timestamp - lastSeekTimeRef.current) < 0.1 && 
          now - lastSeekTimeRef.current < 300) {
        console.log('[useAudioPlaybackControl] Ignoring duplicate seek operation');
        seekOperationInProgressRef.current = false;
        return;
      }
      
      lastSeekTimeRef.current = timestamp;
      
      console.log(`[useAudioPlaybackControl] Seeking to ${timestamp.toFixed(2)}s, wasPlaying: ${isPlaying}`);
      
      // Perform the seek operation
      seekToTimestamp(timestamp);
      
      // Was the audio playing before? If so, resume after a shorter delay
      // to allow the seek operation to complete
      if (isPlaying) {
        setTimeout(() => {
          console.log('[useAudioPlaybackControl] Auto-resuming playback after seek');
          originalHandlePlayPause();
          
          // Set another timeout to check if play state is correct
          setTimeout(() => {
            if (lastPlayStateRef.current !== isPlaying) {
              console.log('[useAudioPlaybackControl] Playback state mismatch detected, syncing');
              originalHandlePlayPause();
            }
          }, 150); // Reduced from 200ms for faster correction
        }, 200); // Reduced from 300ms for faster resume
      }
      
      // Reset the seek operation flag after a delay
      setTimeout(() => {
        seekOperationInProgressRef.current = false;
        console.log('[useAudioPlaybackControl] Seek operation completed and flag reset');
      }, 400); // Slightly reduced from 500ms
    } catch (error) {
      // Make sure to reset the flag even if an error occurs
      seekOperationInProgressRef.current = false;
      console.error('[useAudioPlaybackControl] Error seeking to segment:', error);
    }
  }, [playbackErrors, isPlaying, originalHandlePlayPause, seekToTimestamp]);

  return {
    handlePlayPause,
    handleSeekToSegment
  };
};
