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

// Phase 4 & 5: Helper to validate video element before operations
const isVideoElementValid = (
  videoElementRef: React.RefObject<HTMLVideoElement | null>,
  currentVideoPath: string | undefined
): boolean => {
  const video = videoElementRef.current;
  
  if (!video) {
    console.warn('[useVideoVisibilitySync] Video element is null');
    return false;
  }
  
  if (!currentVideoPath) {
    console.warn('[useVideoVisibilitySync] No video path set');
    return false;
  }
  
  if (video.readyState < 2) {
    console.warn('[useVideoVisibilitySync] Video not ready, readyState:', video.readyState);
    return false;
  }
  
  return true;
};

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

  console.log('[useVideoVisibilitySync] Hook mounted/updated', {
    isPlaying,
    isLoading,
    isReady,
    hasVideoPath: !!currentVideoPath,
    hasVideoElement: !!videoElementRef.current,
    videoReadyState: videoElementRef.current?.readyState,
  });

  useEffect(() => {
    console.log('[useVideoVisibilitySync] Setting up visibilitychange listener');
    const handleVisibilityChange = () => {
      const now = Date.now();
      const videoElement = videoElementRef.current;

      console.log('[useVideoVisibilitySync] Visibility changed:', { 
        hidden: document.hidden,
        hasVideo: !!videoElement,
        videoReadyState: videoElement?.readyState,
        isPlaying,
        isReady
      });

      if (document.hidden) {
        // Tab is hidden
        wasPlayingBeforeTabChange.current = isPlaying;
        wasVideoLoadingOnHide.current = isLoading;
        lastSeenTabVisible.current = now;
        console.log("[useVideoVisibilitySync] Tab hidden. Was playing:", isPlaying, "Was loading:", isLoading, "Video ready state:", videoElement?.readyState);

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
        
        // Phase 4: Use validation helper
        const videoElementIsValid = isVideoElementValid(videoElementRef, currentVideoPath);
        const videoElement = videoElementRef.current;
        const videoIsReady = videoElement && videoElement.readyState >= 3;
        
        const shouldTryResume = wasPlayingBeforeTabChange.current &&
                               !isPlaying && // Only resume if not already playing
                               currentVideoPath &&
                               wasAwayLessThan30Min &&
                               resumeAttemptCountRef.current < 3 &&
                               isReady &&
                               videoElementIsValid &&
                               videoIsReady;
        
        console.log("[useVideoVisibilitySync] Resume conditions check:", {
          wasPlaying: wasPlayingBeforeTabChange.current,
          isNowPlaying: isPlaying,
          hasVideoPath: !!currentVideoPath,
          lessThan30Min: wasAwayLessThan30Min,
          attempts: resumeAttemptCountRef.current,
          isReady,
          videoIsReady,
          videoReadyState: videoElement?.readyState,
          shouldTryResume
        });

        // Clear any pending resume timeout
        if (resumeTimeoutRef.current) {
          clearTimeout(resumeTimeoutRef.current);
          resumeTimeoutRef.current = null;
        }

        if (shouldTryResume) {
          resumeAttemptCountRef.current += 1;
          console.log(`[useVideoVisibilitySync] Attempting resume (Attempt ${resumeAttemptCountRef.current}). Waiting for stability...`);

          // Phase 4: Enhanced resume with better error handling
          resumeTimeoutRef.current = setTimeout(() => {
            // Double-check conditions before playing
            const stillValid = isVideoElementValid(videoElementRef, currentVideoPath);
            const stillReady = videoElementRef.current && videoElementRef.current.readyState >= 3;
            
            if (wasPlayingBeforeTabChange.current && !isPlaying && currentVideoPath && isReady && stillValid && stillReady && !document.hidden) {
              console.log("[useVideoVisibilitySync] Executing delayed play after tab visibility change. Video readyState:", videoElementRef.current?.readyState);
              try {
                // Attempt to play with proper error handling
                const video = videoElementRef.current;
                if (video) {
                  const playPromise = video.play();
                  if (playPromise) {
                    playPromise.catch(error => {
                      console.error("[useVideoVisibilitySync] Autoplay blocked by browser:", error);
                      // Import toast at top of file
                      const { toast } = require('sonner');
                      toast.info('Click video to continue playback', { 
                        duration: 5000,
                        description: 'Browser autoplay policy requires user interaction'
                      });
                    });
                  }
                }
                triggerPlay();
              } catch (e) {
                console.error("[useVideoVisibilitySync] Error resuming playback:", e);
              }
            } else {
              console.log("[useVideoVisibilitySync] Conditions for resume no longer met after delay:", {
                wasPlaying: wasPlayingBeforeTabChange.current,
                isPlaying,
                hasVideoPath: !!currentVideoPath,
                isReady,
                stillValid,
                stillReady,
                hidden: document.hidden
              });
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
    console.log('[useVideoVisibilitySync] Event listener attached');

    return () => {
      console.log('[useVideoVisibilitySync] Cleanup - removing event listener');
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (resumeTimeoutRef.current) {
        clearTimeout(resumeTimeoutRef.current);
        resumeTimeoutRef.current = null;
      }
    };
  }, [isPlaying, isLoading, isReady, currentVideoPath, triggerPlay, triggerPause]);

  // No return value needed, purely side-effects
};
