import { useEffect, useRef } from "react";

interface VideoVisibilitySyncOptions {
  isPlaying: boolean;
  isReady: boolean;
  currentVideoPath: string | undefined;
  videoElementRef: React.RefObject<HTMLVideoElement | null>;
  triggerPlay: () => void;
}

/**
 * Radio-style video persistence hook - matches working radio implementation.
 * Key: Does NOT pause on tab hide, but DOES resume on tab show.
 * This allows background playback while ensuring resumption after tab switches.
 */
export const useVideoVisibilitySync = ({
  isPlaying,
  isReady,
  currentVideoPath,
  videoElementRef,
  triggerPlay,
}: VideoVisibilitySyncOptions) => {
  const wasPlayingBeforeTabChange = useRef<boolean>(false);
  const lastSeenTabVisible = useRef<number>(Date.now());
  const resumeAttemptCountRef = useRef<number>(0);
  const resumeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleVisibilityChange = () => {
      const now = Date.now();

      if (document.hidden) {
        // Tab hidden - save state but DO NOT pause (this allows background playback)
        wasPlayingBeforeTabChange.current = isPlaying;
        lastSeenTabVisible.current = now;
        console.log("[useVideoVisibilitySync] Tab hidden. Was playing:", isPlaying);
        
        // NO PAUSE CALL - this is the key! Matches radio behavior.
        
      } else {
        // Tab visible - try to resume if it was playing
        const timeHiddenSeconds = Math.round((now - lastSeenTabVisible.current) / 1000);
        console.log("[useVideoVisibilitySync] Tab visible. Was playing:", wasPlayingBeforeTabChange.current, "Hidden for:", timeHiddenSeconds + "s");

        // Reset resume attempts if video changed while hidden
        if (!currentVideoPath) {
          resumeAttemptCountRef.current = 0;
        }

        const wasAwayLessThan30Min = (now - lastSeenTabVisible.current) < 30 * 60 * 1000;
        const shouldTryResume = wasPlayingBeforeTabChange.current &&
                               !isPlaying && // Only resume if not already playing
                               currentVideoPath &&
                               wasAwayLessThan30Min &&
                               resumeAttemptCountRef.current < 3 &&
                               isReady; // Ensure video is ready

        // Clear any pending resume timeout
        if (resumeTimeoutRef.current) {
          clearTimeout(resumeTimeoutRef.current);
          resumeTimeoutRef.current = null;
        }

        if (shouldTryResume) {
          resumeAttemptCountRef.current += 1;
          console.log(`[useVideoVisibilitySync] Attempting resume (Attempt ${resumeAttemptCountRef.current}). Waiting for stability...`);

          // Use a delay to ensure video is stable after tab focus
          resumeTimeoutRef.current = setTimeout(() => {
            // Double-check conditions before playing
            if (wasPlayingBeforeTabChange.current && !isPlaying && currentVideoPath && isReady && !document.hidden) {
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
          }, 800); // Increased delay for stability

        } else if (resumeAttemptCountRef.current >= 3) {
          console.log("[useVideoVisibilitySync] Max resume attempts reached.");
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
  }, [isPlaying, isReady, currentVideoPath, triggerPlay, videoElementRef]);

  // No return value needed, purely for observability
};
