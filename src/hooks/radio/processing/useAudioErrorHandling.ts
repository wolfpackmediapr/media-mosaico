
import { useState, useEffect, useRef, useCallback } from "react";
import { getAudioFormatDetails } from "@/utils/audio-format-helper";
import { toast } from "sonner";

interface AudioErrorHandlingOptions {
  currentFile: File | null;
  playerAudioError: string | null; // Error directly from the underlying player
  onClearError?: () => void; // Optional callback when error is cleared
}

/**
 * Hook to manage audio playback error state and basic recovery.
 */
export const useAudioErrorHandling = ({
  currentFile,
  playerAudioError,
  onClearError
}: AudioErrorHandlingOptions) => {
  const [playbackErrors, setPlaybackErrors] = useState<string | null>(null);
  const errorShownRef = useRef<boolean>(false);
  const lastErrorTime = useRef<number>(0);
  const recoveryTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Reset error state when file changes
  useEffect(() => {
    if (currentFile) {
      setPlaybackErrors(null);
      errorShownRef.current = false;
      if (recoveryTimerRef.current) {
        clearTimeout(recoveryTimerRef.current);
        recoveryTimerRef.current = null;
      }
      console.log(`[useAudioErrorHandling] New file loaded, resetting errors.`);
    }
  }, [currentFile]);

  // Sync with audioError from the underlying player
  useEffect(() => {
    if (playerAudioError && playerAudioError !== playbackErrors) {
      console.warn('[useAudioErrorHandling] Received error from player:', playerAudioError);
      setPlaybackErrors(playerAudioError);
    }
  }, [playerAudioError, playbackErrors]);

  // Handle showing error toasts (throttled)
  const handleErrorNotification = useCallback((error: string) => {
    const now = Date.now();
    console.error('[useAudioErrorHandling] Audio error:', error);

    // Don't show too many error toasts for the same issue (throttle to once per 10 seconds)
    if (!errorShownRef.current || (now - lastErrorTime.current > 10000)) {
      errorShownRef.current = true;
      lastErrorTime.current = now;

      if (currentFile) {
        const details = getAudioFormatDetails(currentFile);
        console.log(`[useAudioErrorHandling] File details: ${details}`);
      }
       // The useAudioPlayer hook often shows its own toast, so we might not need one here.
       // If needed, uncomment the line below:
       // toast.error("Error de reproducción de audio", { description: error, duration: 5000 });
    }
  }, [currentFile]);


  // Effect to handle error notification and potential recovery
  useEffect(() => {
    if (playbackErrors) {
      handleErrorNotification(playbackErrors);

      // Attempt recovery for specific errors (e.g., AbortError)
      if (playbackErrors.includes("AbortError") && currentFile) {
        console.log("[useAudioErrorHandling] Detected AbortError, attempting recovery");

        // Clear existing timer if any
        if (recoveryTimerRef.current) {
          clearTimeout(recoveryTimerRef.current);
        }

        // Clear error after a delay to allow retry
        recoveryTimerRef.current = setTimeout(() => {
          console.log("[useAudioErrorHandling] Clearing AbortError state to allow retry");
          setPlaybackErrors(null);
          errorShownRef.current = false;
          onClearError?.(); // Notify parent if needed
          recoveryTimerRef.current = null;
        }, 3000);
      }
    }

    // Cleanup timer on unmount or when errors clear
    return () => {
      if (recoveryTimerRef.current) {
        clearTimeout(recoveryTimerRef.current);
      }
    };
  }, [playbackErrors, currentFile, handleErrorNotification, onClearError]);

  return {
    playbackErrors,
    setPlaybackErrors // Allow external setting if absolutely necessary
  };
};

