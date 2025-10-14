import { RefObject, useEffect, useRef } from 'react';
import { useMediaPersistence } from '@/context/MediaPersistenceContext';

interface UseVideoVisibilitySyncOptions {
  videoRef: RefObject<HTMLVideoElement>;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  currentFileId?: string;
  videoSrc?: string;
}

/**
 * Hook to handle video playback persistence across browser tab visibility changes
 * Automatically resumes video when returning to tab if it was playing before
 */
export const useVideoVisibilitySync = ({
  videoRef,
  isPlaying,
  setIsPlaying,
  currentFileId,
  videoSrc
}: UseVideoVisibilitySyncOptions) => {
  const wasPlayingBeforeHidden = useRef(false);
  const resumeTimeoutRef = useRef<NodeJS.Timeout>();
  const { activeMediaRoute, updatePlaybackPosition } = useMediaPersistence();
  
  useEffect(() => {
    const handleVisibilityChange = () => {
      const video = videoRef.current;
      if (!video || activeMediaRoute !== '/tv') return;
      
      if (document.hidden) {
        // Tab hidden - save state
        wasPlayingBeforeHidden.current = !video.paused;
        
        // Save playback position
        if (currentFileId && video.currentTime > 0) {
          updatePlaybackPosition(currentFileId, video.currentTime);
        }
        
        console.log('[useVideoVisibilitySync] Tab hidden, was playing:', wasPlayingBeforeHidden.current);
      } else {
        // Tab visible - restore playback
        console.log('[useVideoVisibilitySync] Tab visible, checking resume...');
        
        if (wasPlayingBeforeHidden.current && video.paused) {
          // Clear any existing timeout
          if (resumeTimeoutRef.current) {
            clearTimeout(resumeTimeoutRef.current);
          }
          
          // Delay resume to ensure video element is ready
          resumeTimeoutRef.current = setTimeout(() => {
            if (video.readyState >= 2 && !video.ended) {
              video.play()
                .then(() => {
                  setIsPlaying(true);
                  console.log('[useVideoVisibilitySync] Video resumed successfully');
                })
                .catch(err => {
                  console.error('[useVideoVisibilitySync] Resume failed:', err);
                  // Don't throw - autoplay might be blocked, user can manually play
                });
            } else {
              console.log('[useVideoVisibilitySync] Video not ready for resume, readyState:', video.readyState);
            }
          }, 500);
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (resumeTimeoutRef.current) {
        clearTimeout(resumeTimeoutRef.current);
      }
    };
  }, [videoRef, activeMediaRoute, currentFileId, setIsPlaying, updatePlaybackPosition]);
};
