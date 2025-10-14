import { useEffect, useRef } from "react";
import { unmuteAudio } from "@/utils/audio-format-helper";

interface VideoVisibilitySyncOptions {
  isPlaying: boolean;
  isLoading: boolean;
  isReady: boolean;
  currentVideoPath: string | undefined;
  videoElementRef: React.RefObject<HTMLVideoElement | null>;
  triggerPlay: () => void;
  triggerPause: () => void;
}

/**
 * Hook to handle pausing/resuming video playback when browser tab visibility changes.
 * Modeled after useAudioVisibilitySync for consistent behavior across media types.
 */
export const useVideoVisibilitySync = ({
  isPlaying,
  isLoading,
  isReady,
  currentVideoPath,
  videoElementRef,
  triggerPlay,
  triggerPause,
}: VideoVisibilitySyncOptions) => {
  const wasPlayingBeforeTabChange = useRef<boolean>(false);
  const wasVideoLoadingOnHide = useRef<boolean>(false);
  const lastSeenTabVisible = useRef<number>(Date.now());
  const resumeAttemptCountRef = useRef<number>(0);
  const resumeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleVisibilityChange = () => {
      const now = Date.now();

      if (document.hidden) {
        // Tab is hidden
        wasPlayingBeforeTabChange.current = isPlaying;
        wasVideoLoadingOnHide.current = isLoading;
        lastSeenTabVisible.current = now;
        console.log("[useVideoVisibilitySync] Tab hidden. Was playing:", isPlaying, "Was loading:", isLoading);

        // Optionally pause video immediately when tab hides
        // Note: Most browsers auto-pause video, but keeping this as a reference
        // if (isPlaying) {
        //   triggerPause();
        // }

      } else {
        // Tab is visible again
        const timeHiddenSeconds = Math.round((now - lastSeenTabVisible.current) / 1000);
        console.log("[useVideoVisibilitySync] Tab visible. Was playing:", wasPlayingBeforeTabChange.current, "Hidden for:", timeHiddenSeconds + "s", "Was loading on hide:", wasVideoLoadingOnHide.current);

        // Try to unlock audio context
        unmuteAudio();

        // Reset resume attempts if video changed while hidden
        if (!currentVideoPath) {
          resumeAttemptCountRef.current = 0;
        }

        const wasAwayLessThan30Min = (now - lastSeenTabVisible.current) < 30 * 60 * 1000;
        const videoElement = videoElementRef.current;
        const videoIsReady = videoElement && videoElement.readyState >= 3; // HAVE_FUTURE_DATA or better
        
        const shouldTryResume = wasPlayingBeforeTabChange.current &&
                               !isPlaying && // Only resume if not already playing
                               currentVideoPath &&
                               wasAwayLessThan30Min &&
                               resumeAttemptCountRef.current < 3 &&
                               isReady &&
                               videoIsReady; // Ensure video element is ready

        // Clear any pending resume timeout
        if (resumeTimeoutRef.current) {
          clearTimeout(resumeTimeoutRef.current);
          resumeTimeoutRef.current = null;
        }

        if (shouldTryResume) {
          resumeAttemptCountRef.current += 1;
          console.log(`[useVideoVisibilitySync] Attempting resume (Attempt ${resumeAttemptCountRef.current}). Waiting for stability...`);

          // Use a delay to ensure video element and audio context are stable after tab focus
          resumeTimeoutRef.current = setTimeout(() => {
            // Double-check conditions before playing
            const stillReady = videoElementRef.current && videoElementRef.current.readyState >= 3;
            if (wasPlayingBeforeTabChange.current && !isPlaying && currentVideoPath && isReady && stillReady && !document.hidden) {
              console.log("[useVideoVisibilitySync] Executing delayed play after tab visibility change.");
              try {
                triggerPlay();
              } catch (e) {
                console.error("[useVideoVisibilitySync] Error resuming playback:", e);
              }
            } else {
              console.log("[useVideoVisibilitySync] Conditions for resume no longer met after delay.");
            }
            resumeTimeoutRef.current = null;
          }, 800); // 800ms delay for stability

        } else if (resumeAttemptCountRef.current >= 3) {
          console.log("[useVideoVisibilitySync] Max resume attempts reached.");
        } else if (!shouldTryResume && wasPlayingBeforeTabChange.current && !isPlaying) {
          console.log("[useVideoVisibilitySync] Conditions not met for automatic resume:", {
            wasPlaying: wasPlayingBeforeTabChange.current, 
            isNowPlaying: isPlaying, 
            hasVideo: !!currentVideoPath, 
            lessThan30Min: wasAwayLessThan30Min, 
            attempts: resumeAttemptCountRef.current, 
            isReady: isReady,
            videoIsReady: videoIsReady
          });
        }

        // Reset if it's playing, otherwise keep count
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
  }, [isPlaying, isLoading, isReady, currentVideoPath, videoElementRef, triggerPlay, triggerPause]);

  // No return value needed, purely side-effects
};
