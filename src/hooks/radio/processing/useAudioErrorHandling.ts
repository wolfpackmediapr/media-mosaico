
import { useState, useEffect, useRef, useCallback } from "react";
import { getAudioFormatDetails, canBrowserPlayFile } from "@/utils/audio-format-helper";
import { toast } from "sonner";

interface AudioErrorHandlingOptions {
  currentFile: File | null;
  playerAudioError: string | null; // Error directly from the underlying player
  onClearError?: () => void; // Optional callback when error is cleared
  onSwitchToNative?: () => void; // Callback to switch to native audio
}

/**
 * Hook to manage audio playback error state and basic recovery.
 */
export const useAudioErrorHandling = ({
  currentFile,
  playerAudioError,
  onClearError,
  onSwitchToNative
}: AudioErrorHandlingOptions) => {
  const [playbackErrors, setPlaybackErrors] = useState<string | null>(null);
  const errorShownRef = useRef<boolean>(false);
  const lastErrorTime = useRef<number>(0);
  const recoveryTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fallbackElementRef = useRef<HTMLAudioElement | null>(null);

  // Reset error state when file changes
  useEffect(() => {
    if (currentFile) {
      setPlaybackErrors(null);
      errorShownRef.current = false;
      if (recoveryTimerRef.current) {
        clearTimeout(recoveryTimerRef.current);
        recoveryTimerRef.current = null;
      }
      
      // Check for known format issues early
      const details = getAudioFormatDetails(currentFile);
      const canPlay = canBrowserPlayFile(currentFile);
      console.log(`[useAudioErrorHandling] New file loaded: ${currentFile.name}`);
      console.log(`[useAudioErrorHandling] File details: ${details}`);
      
      // Create a fallback audio element to try to play the file directly if needed
      if (!fallbackElementRef.current) {
        fallbackElementRef.current = new Audio();
      }
      
      // Proactive warning for incompatible formats
      if (!canPlay) {
        const message = `El formato de audio ${currentFile.name.split('.').pop()?.toUpperCase()} podría no ser compatible con este navegador.`;
        console.warn(message);
        // Only show toast for format incompatibility if this is a new file
        toast.warning("Formato de audio potencialmente incompatible", { 
          description: message,
          duration: 5000
        });
      }
    }
    
    return () => {
      // Clean up fallback audio element
      if (fallbackElementRef.current) {
        fallbackElementRef.current.src = '';
        fallbackElementRef.current.load();
      }
    };
  }, [currentFile]);

  // Try to play with native HTML5 audio as a fallback
  const attemptFallbackPlay = useCallback(() => {
    if (!currentFile || !fallbackElementRef.current) return false;
    
    try {
      const url = URL.createObjectURL(currentFile);
      fallbackElementRef.current.src = url;
      
      // Listen for errors and success
      const handleCanPlay = () => {
        console.log('[useAudioErrorHandling] Fallback audio can play the file');
        // We can play this file with native audio, suggest using it
        toast.info('Reproducción nativa disponible', {
          description: 'Puede utilizar el reproductor nativo de HTML5 en lugar del reproductor avanzado para este archivo.',
          duration: 8000,
          action: {
            label: 'Usar nativo',
            onClick: () => {
              // Trigger switch to native audio if available
              if (onSwitchToNative) {
                onSwitchToNative();
              }
            }
          }
        });
        
        // Clean up
        fallbackElementRef.current?.removeEventListener('canplay', handleCanPlay);
        fallbackElementRef.current?.removeEventListener('error', handleError);
      };
      
      const handleError = () => {
        console.log('[useAudioErrorHandling] Fallback audio also failed to play the file');
        // File really can't be played
        fallbackElementRef.current?.removeEventListener('canplay', handleCanPlay);
        fallbackElementRef.current?.removeEventListener('error', handleError);
      };
      
      fallbackElementRef.current.addEventListener('canplay', handleCanPlay, { once: true });
      fallbackElementRef.current.addEventListener('error', handleError, { once: true });
      
      fallbackElementRef.current.load();
      return true;
    } catch (error) {
      console.error('[useAudioErrorHandling] Error setting up fallback audio:', error);
      return false;
    }
  }, [currentFile, onSwitchToNative]);

  // Sync with audioError from the underlying player
  useEffect(() => {
    if (playerAudioError && playerAudioError !== playbackErrors) {
      console.warn('[useAudioErrorHandling] Received error from player:', playerAudioError);
      setPlaybackErrors(playerAudioError);
      
      // If we get a codec error, try the fallback player
      if (playerAudioError.includes("codec") || 
          playerAudioError.includes("No codec support") ||
          playerAudioError.includes("_id")) {
        attemptFallbackPlay();
        
        // For serious issues, auto-switch to native player if possible
        if (playerAudioError.includes("_id") && onSwitchToNative) {
          console.log('[useAudioErrorHandling] Auto-switching to native player due to critical error');
          onSwitchToNative();
        }
      }
    }
  }, [playerAudioError, playbackErrors, attemptFallbackPlay, onSwitchToNative]);

  // Handle showing error toasts (throttled)
  const handleErrorNotification = useCallback((error: string) => {
    const now = Date.now();
    console.error('[useAudioErrorHandling] Audio error:', error);

    // Don't show too many error toasts for the same issue (throttle to once per 10 seconds)
    if (!errorShownRef.current || (now - lastErrorTime.current > 10000)) {
      errorShownRef.current = true;
      lastErrorTime.current = now;

      // Check for common error patterns
      const isFormatError = error.includes('format') || error.includes('NotSupported') || 
                            error.includes('codec') || error.includes('_id');
      const isPermissionError = error.includes('NotAllowed') || error.includes('permission');
      const isNetworkError = error.includes('network') || error.includes('fetch') || error.includes('load');
      
      if (currentFile) {
        if (isFormatError) {
          toast.error("Formato de audio incompatible", { 
            description: `El navegador no puede reproducir este formato de archivo: ${currentFile.name.split('.').pop()?.toUpperCase()}. Intente utilizar el reproductor nativo en su lugar.`,
            duration: 5000,
            action: onSwitchToNative ? {
              label: 'Usar nativo',
              onClick: onSwitchToNative
            } : undefined
          });
          // Try fallback
          attemptFallbackPlay();
        } else if (isPermissionError) {
          toast.error("Permiso denegado", { 
            description: "El navegador no permite reproducir audio automáticamente. Haga clic en el botón de reproducción.",
            duration: 5000
          });
        } else if (isNetworkError) {
          toast.error("Error de carga", { 
            description: "No se pudo cargar el archivo de audio.",
            duration: 5000
          });
        } else {
          // Generic error
          toast.error("Error de reproducción", { 
            description: "Ocurrió un problema al reproducir el audio.",
            duration: 5000
          });
        }
      }
    }
  }, [currentFile, attemptFallbackPlay, onSwitchToNative]);

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
    setPlaybackErrors, // Allow external setting if absolutely necessary
    attemptFallbackPlay // Expose the fallback play method
  };
};
