import { useEffect, useRef, useState } from "react";
import { unmuteAudio } from "@/utils/audio-format-helper";

interface ExternalAudioSyncOptions {
  isActiveMediaRoute: boolean;
  externalIsPlaying: boolean;
  internalIsPlaying: boolean;
  isLoading: boolean;
  isReady: boolean;
  currentFile: File | null;
  playbackErrors: string | null;
  triggerPlay: () => void;
  triggerPause: () => void;
  onInternalPlayStateChange: (isPlaying: boolean) => void;
}

/**
 * Hook to synchronize internal audio playback state with external controls/state
 * (e.g., global media state, media session controls).
 */
export const useExternalAudioSync = ({
  isActiveMediaRoute,
  externalIsPlaying,
  internalIsPlaying,
  isLoading,
  isReady,
  currentFile,
  playbackErrors,
  triggerPlay,
  triggerPause,
  onInternalPlayStateChange,
}: ExternalAudioSyncOptions) => {
  const [operationInProgress, setOperationInProgress] = useState(false);
  const operationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const prevInternalPlayingState = useRef(internalIsPlaying);

  const cleanupPendingOperation = () => {
    if (operationTimeoutRef.current) {
      clearTimeout(operationTimeoutRef.current);
      operationTimeoutRef.current = null;
    }
    setOperationInProgress(false);
  };

  // Effect to react to external play/pause commands
  useEffect(() => {
    if (!isActiveMediaRoute || operationInProgress) {
      return; // Only act if this is the active route and no operation is pending
    }

    const hasChanged = externalIsPlaying !== internalIsPlaying;

    if (hasChanged) {
        console.log(`[useExternalAudioSync] External state (${externalIsPlaying}) differs from internal (${internalIsPlaying}). Syncing.`);
        cleanupPendingOperation(); // Clear previous potential operation

        if (externalIsPlaying) {
            // External wants to play
            if (!internalIsPlaying && currentFile && !playbackErrors && isReady && !isLoading) {
                console.log("[useExternalAudioSync] Triggering PLAY based on external state.");
                setOperationInProgress(true);
                operationTimeoutRef.current = setTimeout(() => {
                    try {
                        unmuteAudio(); // Ensure context is active
                        triggerPlay();
                        // internalIsPlaying change will reset operationInProgress
                    } catch (err) {
                        console.error("[useExternalAudioSync] Error during external play trigger:", err);
                        cleanupPendingOperation();
                    }
                }, 150); // Small delay
            } else {
                 console.log("[useExternalAudioSync] Conditions not met for external play trigger:", { hasFile: !!currentFile, noErrors: !playbackErrors, isReady, isLoading: isLoading });
            }
        } else {
            // External wants to pause
            if (internalIsPlaying) {
                console.log("[useExternalAudioSync] Triggering PAUSE based on external state.");
                setOperationInProgress(true);
                operationTimeoutRef.current = setTimeout(() => {
                    try {
                        triggerPause();
                        // internalIsPlaying change will reset operationInProgress
                    } catch (err) {
                        console.error("[useExternalAudioSync] Error during external pause trigger:", err);
                        cleanupPendingOperation();
                    }
                }, 150); // Small delay
            }
        }
    }

  }, [
    isActiveMediaRoute,
    externalIsPlaying,
    internalIsPlaying,
    currentFile,
    playbackErrors,
    isReady,
    isLoading,
    triggerPlay,
    triggerPause,
    operationInProgress // Dependency to prevent re-triggering mid-operation
  ]);

  // Effect to notify parent and reset operation flag when internal state actually changes
  useEffect(() => {
    if (internalIsPlaying !== prevInternalPlayingState.current) {
      console.log(`[useExternalAudioSync] Internal play state changed to: ${internalIsPlaying}. Notifying parent.`);
      onInternalPlayStateChange(internalIsPlaying);
      prevInternalPlayingState.current = internalIsPlaying;

      // If an operation was in progress, this change completes it
      if (operationInProgress) {
        cleanupPendingOperation();
      }

      // Update media session state (might move to a dedicated media session hook later)
      if ('mediaSession' in navigator) {
        try {
          navigator.mediaSession.playbackState = internalIsPlaying ? 'playing' : 'paused';
        } catch (e) {
          console.warn("[useExternalAudioSync] Error updating media session state:", e);
        }
      }
    }
  }, [internalIsPlaying, onInternalPlayStateChange, operationInProgress]); // Added operationInProgress

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupPendingOperation();
    };
  }, []);

  // Return the operation status if needed
  return { operationInProgress };
};
