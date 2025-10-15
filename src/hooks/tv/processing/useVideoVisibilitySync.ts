import { useEffect, useRef } from "react";

interface VideoVisibilitySyncOptions {
  isPlaying: boolean;
  currentVideoPath: string | undefined;
  videoElementRef: React.RefObject<HTMLVideoElement | null>;
}

/**
 * YouTube-style video persistence hook.
 * This hook ONLY tracks visibility state for logging/analytics.
 * It does NOT control playback - the browser handles that naturally.
 * 
 * Key insight: YouTube doesn't pause/resume videos on tab switch.
 * They let the browser's native HTML5 video behavior handle it.
 */
export const useVideoVisibilitySync = ({
  isPlaying,
  currentVideoPath,
  videoElementRef,
}: VideoVisibilitySyncOptions) => {
  const wasPlayingBeforeTabChange = useRef<boolean>(false);
  const lastSeenTabVisible = useRef<number>(Date.now());

  useEffect(() => {
    const handleVisibilityChange = () => {
      const now = Date.now();

      if (document.hidden) {
        // Tab hidden - ONLY save state, DO NOT pause
        wasPlayingBeforeTabChange.current = isPlaying;
        lastSeenTabVisible.current = now;
        console.log("[useVideoVisibilitySync] Tab hidden. Video continues in background.", {
          wasPlaying: isPlaying,
          videoStillPlaying: videoElementRef.current ? !videoElementRef.current.paused : 'unknown'
        });
        
        // NO PAUSE CALL - this is key! Let browser handle it naturally.
        
      } else {
        // Tab visible - ONLY log, DO NOT resume
        const timeHiddenSeconds = Math.round((now - lastSeenTabVisible.current) / 1000);
        console.log("[useVideoVisibilitySync] Tab visible.", {
          wasPlaying: wasPlayingBeforeTabChange.current,
          hiddenFor: timeHiddenSeconds + "s",
          videoStillPlaying: videoElementRef.current ? !videoElementRef.current.paused : 'unknown',
          videoCurrentTime: videoElementRef.current?.currentTime
        });
        
        // NO PLAY CALL - video already playing naturally if it was before!
        // Browser handles background playback automatically for HTML5 video.
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isPlaying, currentVideoPath, videoElementRef]);

  // No return value needed, purely for observability
};
