import { useEffect, useRef } from "react";
import { unmuteAudio } from "@/utils/audio-format-helper";

interface AudioVisibilitySyncOptions {
  isPlaying: boolean;
  isLoading: boolean;
  isReady: boolean;
  currentFile: File | null;
  playbackErrors: string | null;
  triggerPlay: () => void;
  triggerPause: () => void; // Added pause trigger
}

/**
 * Hook to handle pausing/resuming audio playback when browser tab visibility changes.
 */
export const useAudioVisibilitySync = ({
  isPlaying,
  isLoading,
  isReady,
  currentFile,
  playbackErrors,
  triggerPlay,
  triggerPause,
}: AudioVisibilitySyncOptions) => {
  const wasPlayingBeforeTabChange = useRef<boolean>(false);
  const wasAudioLoadingOnHide = useRef<boolean>(false);
  const lastSeenTabVisible = useRef<number>(Date.now());
  const resumeAttemptCountRef = useRef<number>(0);
  const resumeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleVisibilityChange = () => {
      const now = Date.now();

      if (document.hidden) {
        // Tab is hidden
        wasPlayingBeforeTabChange.current = isPlaying;
        wasAudioLoadingOnHide.current = isLoading;
        lastSeenTabVisible.current = now;
        console.log("[useAudioVisibilitySync] Tab hidden. Was playing:", isPlaying, "Was loading:", isLoading);

        // Optionally pause audio immediately when tab hides (can be browser-dependent)
        // if (isPlaying) {
        //   triggerPause(); // Consider if this causes issues with background play needs
        // }

      } else {
        // Tab is visible again
        const timeHiddenSeconds = Math.round((now - lastSeenTabVisible.current) / 1000);
        console.log("[useAudioVisibilitySync] Tab visible. Was playing:", wasPlayingBeforeTabChange.current, "Hidden for:", timeHiddenSeconds + "s", "Was loading on hide:", wasAudioLoadingOnHide.current);

        // Try to unlock audio context
        unmuteAudio();

        // Reset resume attempts if file changed while hidden
        if (!currentFile) {
          resumeAttemptCountRef.current = 0;
        }

        const wasAwayLessThan30Min = (now - lastSeenTabVisible.current) < 30 * 60 * 1000;
        const shouldTryResume = wasPlayingBeforeTabChange.current &&
                               !isPlaying && // Only resume if not already playing
                               currentFile &&
                               !playbackErrors &&
                               wasAwayLessThan30Min &&
                               resumeAttemptCountRef.current < 3 &&
                               isReady; // Ensure audio is ready

        // Clear any pending resume timeout
        if (resumeTimeoutRef.current) {
          clearTimeout(resumeTimeoutRef.current);
          resumeTimeoutRef.current = null;
        }

        if (shouldTryResume) {
          resumeAttemptCountRef.current += 1;
          console.log(`[useAudioVisibilitySync] Attempting resume (Attempt ${resumeAttemptCountRef.current}). Waiting for stability...`);

          // Use a delay to ensure audio context is stable after tab focus
          resumeTimeoutRef.current = setTimeout(() => {
            // Double-check conditions before playing
             if (wasPlayingBeforeTabChange.current && !isPlaying && currentFile && !playbackErrors && isReady && !document.hidden) {
               console.log("[useAudioVisibilitySync] Executing delayed play after tab visibility change.");
               try {
                  triggerPlay();
               } catch (e) {
                  console.error("[useAudioVisibilitySync] Error resuming playback:", e);
               }
             } else {
                console.log("[useAudioVisibilitySync] Conditions for resume no longer met after delay.");
             }
            resumeTimeoutRef.current = null;
          }, 800); // Increased delay might help stability

        } else if (resumeAttemptCountRef.current >= 3) {
          console.log("[useAudioVisibilitySync] Max resume attempts reached.");
        } else if (!shouldTryResume && wasPlayingBeforeTabChange.current && !isPlaying) {
          console.log("[useAudioVisibilitySync] Conditions not met for automatic resume:", {
             wasPlaying: wasPlayingBeforeTabChange.current, isNowPlaying: isPlaying, hasFile: !!currentFile, noErrors: !playbackErrors, lessThan30Min: wasAwayLessThan30Min, attempts: resumeAttemptCountRef.current, isReady: isReady
          });
        }

        // Reset if it was playing, otherwise keep count
        if (isPlaying) {
             resumeAttemptCountRef.current = 0;
        }

      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (resumeTimeoutRef.current) {
        clearTimeout(resumeTimeoutRef.current);
        resumeTimeoutRef.current = null;
      }
    };
    // Ensure triggerPlay/triggerPause are stable or wrapped in useCallback in the parent hook
  }, [isPlaying, isLoading, isReady, currentFile, playbackErrors, triggerPlay, triggerPause]);

  // No return value needed, purely side-effects
};
