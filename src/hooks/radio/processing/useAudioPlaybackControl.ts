
import { useCallback, useRef } from 'react';
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

  // Enhanced play/pause handler with error checking
  const handlePlayPause = useCallback(() => {
    if (playbackErrors) {
      console.error('[useAudioPlaybackControl] Cannot play/pause due to errors:', playbackErrors);
      return;
    }
    
    if (seekOperationInProgressRef.current) {
      console.log('[useAudioPlaybackControl] Ignoring play/pause during seek operation');
      return;
    }
    
    try {
      originalHandlePlayPause();
    } catch (error) {
      console.error('[useAudioPlaybackControl] Error during play/pause:', error);
    }
  }, [playbackErrors, originalHandlePlayPause]);

  // Handler for seeking to a specific segment
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
      
      // Check if this is a duplicate seek operation (within 500ms)
      const now = Date.now();
      if (Math.abs(timestamp - lastSeekTimeRef.current) < 0.1 && 
          now - lastSeekTimeRef.current < 500) {
        console.log('[useAudioPlaybackControl] Ignoring duplicate seek operation');
        seekOperationInProgressRef.current = false;
        return;
      }
      
      lastSeekTimeRef.current = timestamp;
      
      console.log(`[useAudioPlaybackControl] Seeking to ${timestamp.toFixed(2)}s`);
      
      // Perform the seek operation
      seekToTimestamp(timestamp);
      
      // Resume playback if it was playing before
      if (isPlaying) {
        setTimeout(() => {
          originalHandlePlayPause();
        }, 300);
      }
      
      // Reset the seek operation flag after a delay
      setTimeout(() => {
        seekOperationInProgressRef.current = false;
      }, 500);
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
