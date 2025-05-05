
import { useRef } from "react";
import { unmuteAudio } from "@/utils/audio-format-helper";
import { RadioNewsSegment } from "@/components/radio/RadioNewsSegmentsContainer";
import { toast } from "sonner";

interface AudioPlaybackControlOptions {
  isPlaying: boolean;
  playbackErrors: string | null;
  originalHandlePlayPause: () => void;
  seekToTimestamp: (time: number) => void;
  onPlayingChange?: (isPlaying: boolean) => void;
}

/**
 * Hook to provide enhanced playback control with error handling and feedback.
 */
export const useAudioPlaybackControl = ({
  isPlaying,
  playbackErrors,
  originalHandlePlayPause,
  seekToTimestamp,
  onPlayingChange = () => {}
}: AudioPlaybackControlOptions) => {
  // Track play/pause operation state to prevent multiple operations at once
  const playPauseOperationInProgress = useRef<boolean>(false);
  const playPauseOperationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const seekOperationInProgressRef = useRef<boolean>(false);
  const seekOperationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Cleanup function to reset all pending operations
  const cleanupPendingOperations = () => {
    // Clear any pending timeouts
    if (playPauseOperationTimeoutRef.current) {
      clearTimeout(playPauseOperationTimeoutRef.current);
      playPauseOperationTimeoutRef.current = null;
    }
    
    if (seekOperationTimeoutRef.current) {
      clearTimeout(seekOperationTimeoutRef.current);
      seekOperationTimeoutRef.current = null;
    }
    
    // Reset operation flags
    playPauseOperationInProgress.current = false;
    seekOperationInProgressRef.current = false;
  };
  
  // Wrapper for play/pause that also updates external state and handles errors
  const handlePlayPause = () => {
    // Don't allow new operations if one is already in progress
    if (playPauseOperationInProgress.current) {
      console.log("[useAudioPlaybackControl] Ignoring play/pause, operation already in progress");
      return;
    }
    
    // Try to unlock audio on every play attempt
    unmuteAudio();
    
    if (playbackErrors) {
      toast.error("No se puede reproducir el audio", { 
        description: "El archivo de audio no se puede reproducir debido a errores",
        duration: 3000
      });
      return;
    }
    
    try {
      // Set flag to indicate operation is in progress
      playPauseOperationInProgress.current = true;
      
      // Clear any existing timeout
      if (playPauseOperationTimeoutRef.current) {
        clearTimeout(playPauseOperationTimeoutRef.current);
      }
      
      // Execute immediately instead of with a delay to improve responsiveness
      try {
        originalHandlePlayPause();
        onPlayingChange(!isPlaying);
        
        // Set a timeout to clear the operation flag after a short delay
        playPauseOperationTimeoutRef.current = setTimeout(() => {
          playPauseOperationInProgress.current = false;
          playPauseOperationTimeoutRef.current = null;
        }, 300); // Allow operations to be done again after 300ms
      } catch (err) {
        console.error("[useAudioPlaybackControl] Error in handlePlayPause:", err);
        playPauseOperationInProgress.current = false;
        toast.error("Error al controlar la reproducción", { 
          duration: 3000
        });
      }
    } catch (err) {
      console.error("[useAudioPlaybackControl] Error in handlePlayPause:", err);
      playPauseOperationInProgress.current = false;
      toast.error("Error al controlar la reproducción", { 
        duration: 3000
      });
    }
  };

  // Enhanced handler to seek to a specific segment with better error handling
  const handleSeekToSegment = (segment: RadioNewsSegment | number) => {
    if (playbackErrors) {
      toast.error("No se puede buscar en el audio", { 
        description: "El archivo de audio no se puede reproducir debido a errores",
        duration: 3000
      });
      return;
    }
    
    // Don't allow new seek operations if one is already in progress
    if (seekOperationInProgressRef.current) {
      console.log("[useAudioPlaybackControl] Ignoring seek, operation already in progress");
      return;
    }
    
    // Clear any existing timeout first
    if (seekOperationTimeoutRef.current) {
      clearTimeout(seekOperationTimeoutRef.current);
      seekOperationTimeoutRef.current = null;
    }
    
    // Set flag to indicate seek operation is in progress
    seekOperationInProgressRef.current = true;
    
    // Handle either segment object or direct timestamp number
    let timestamp: number;
    
    if (typeof segment === 'number') {
      timestamp = segment;
      console.log(`[useAudioPlaybackControl] Seeking to time ${timestamp.toFixed(2)}s (from number)`);
    } else if (segment && typeof segment === 'object' && segment.startTime !== undefined) {
      // IMPROVED: Ensure consistent time unit handling (milliseconds to seconds)
      timestamp = typeof segment.startTime === 'number' ? 
        (segment.startTime > 1000 ? segment.startTime / 1000 : segment.startTime) : 0;
      console.log(`[useAudioPlaybackControl] Seeking to time ${timestamp.toFixed(2)}s (from segment)`);
    } else {
      console.error("[useAudioPlaybackControl] Invalid segment or missing startTime:", segment);
      seekOperationInProgressRef.current = false;
      return;
    }
    
    try {
      // Execute seek operation immediately without delay
      seekToTimestamp(timestamp);
      
      // Optionally start playing if not already playing, but after a longer delay
      // IMPROVED: Increase delay from 100ms to 300ms
      if (!isPlaying) {
        setTimeout(() => {
          try {
            handlePlayPause();
          } catch (err) {
            console.error("[useAudioPlaybackControl] Error in delayed play after seek:", err);
          }
        }, 300); // Increased from 100ms to give seek time to complete
      }
      
      // Clear the seek operation flag after a delay
      // IMPROVED: Use a dedicated timeout reference for proper cleanup
      seekOperationTimeoutRef.current = setTimeout(() => {
        seekOperationInProgressRef.current = false;
        seekOperationTimeoutRef.current = null;
        console.log("[useAudioPlaybackControl] Seek operation completed and flag cleared");
      }, 800); // Longer timeout to ensure seeking fully completes
    } catch (err) {
      console.error("[useAudioPlaybackControl] Error in handleSeekToSegment:", err);
      // Make sure we clear the flag even if there's an error
      seekOperationInProgressRef.current = false;
    }
  };

  // Return both handler functions and the cleanup function
  return {
    handlePlayPause,
    handleSeekToSegment,
    cleanupPendingOperations
  };
};
