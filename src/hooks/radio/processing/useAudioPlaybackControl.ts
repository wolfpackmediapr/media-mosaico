
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
  
  // Cleanup function to reset all pending operations
  const cleanupPendingOperations = () => {
    if (playPauseOperationTimeoutRef.current) {
      clearTimeout(playPauseOperationTimeoutRef.current);
      playPauseOperationTimeoutRef.current = null;
    }
    playPauseOperationInProgress.current = false;
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
      
      // Use a small delay to prevent rapid state changes
      playPauseOperationTimeoutRef.current = setTimeout(() => {
        try {
          originalHandlePlayPause();
          onPlayingChange(!isPlaying);
        } catch (err) {
          console.error("[useAudioPlaybackControl] Error in delayed handlePlayPause:", err);
          playPauseOperationInProgress.current = false;
          toast.error("Error al controlar la reproducción", { 
            duration: 3000
          });
        }
      }, 50);
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
    
    // Handle either segment object or direct timestamp number
    let timestamp: number;
    
    if (typeof segment === 'number') {
      timestamp = segment;
    } else if (segment && typeof segment === 'object' && segment.startTime !== undefined) {
      timestamp = segment.startTime;
    } else {
      console.error("[useAudioPlaybackControl] Invalid segment or missing startTime:", segment);
      return;
    }
    
    console.log(`[useAudioPlaybackControl] Seeking to time ${timestamp}s`);
    
    try {
      // Add a small delay before seeking to avoid potential race conditions
      setTimeout(() => {
        try {
          seekToTimestamp(timestamp);
          
          // Set playing state after a longer delay to ensure seek completes first
          setTimeout(() => {
            if (!isPlaying) {
              handlePlayPause();
            }
          }, 300);
        } catch (innerErr) {
          console.error("[useAudioPlaybackControl] Error in delayed seek:", innerErr);
        }
      }, 150);
    } catch (err) {
      console.error("[useAudioPlaybackControl] Error in handleSeekToSegment:", err);
    }
  };

  // Return both handler functions and the cleanup function
  return {
    handlePlayPause,
    handleSeekToSegment,
    cleanupPendingOperations
  };
};
