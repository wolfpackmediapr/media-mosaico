
import { useEffect, useRef } from "react";
import { useMediaPersistence } from "@/context/MediaPersistenceContext";

export const usePersistentAudioState = () => {
  const { activeMediaRoute, setActiveMediaRoute, isMediaPlaying, setIsMediaPlaying, lastPlaybackPosition } = useMediaPersistence();
  const initialLoad = useRef(true);
  
  // Set this component as the active media route when mounted
  useEffect(() => {
    // Register this component as the active media route
    setActiveMediaRoute('/radio');
    
    // On first load, check if we should auto-resume playback
    if (initialLoad.current) {
      initialLoad.current = false;
      
      // Check if we were previously playing before page refresh
      const wasPlaying = sessionStorage.getItem('media-playing') === 'true';
      const lastRoute = sessionStorage.getItem('last-active-route');
      
      // Only auto-resume if this was the last active media route
      if (wasPlaying && lastRoute === '/radio') {
        console.log("[usePersistentAudioState] Auto-resuming playback state after reload");
        // Small delay to ensure everything is ready
        setTimeout(() => {
          setIsMediaPlaying(true);
        }, 500);
      }
    }
    
    // Handle visibility changes to make sure we update the media route when returning to the page
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        setActiveMediaRoute('/radio');
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Cleanup when unmounting
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      // Only clear if we're the active route
      if (activeMediaRoute === '/radio') {
        // We don't clear the active route here so that the player stays "active"
        // even when navigating away
      }
    };
  }, [setActiveMediaRoute]);

  return {
    isActiveMediaRoute: activeMediaRoute === '/radio',
    isMediaPlaying,
    setIsMediaPlaying,
    lastPlaybackPosition
  };
};
