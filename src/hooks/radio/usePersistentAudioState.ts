
import { useEffect, useRef, useState } from "react";
import { useMediaPersistence } from "@/context/MediaPersistenceContext";

export const usePersistentAudioState = () => {
  const { activeMediaRoute, setActiveMediaRoute, isMediaPlaying, setIsMediaPlaying } = useMediaPersistence();
  const [lastPlaybackPosition, setLastPlaybackPosition] = useState<number | undefined>(undefined);
  const initialLoad = useRef(true);
  
  // Load last playback position on mount
  useEffect(() => {
    try {
      const savedPosition = sessionStorage.getItem('radio-last-position');
      if (savedPosition) {
        const position = parseFloat(savedPosition);
        if (!isNaN(position)) {
          setLastPlaybackPosition(position);
          console.log(`[usePersistentAudioState] Loaded last position: ${position.toFixed(2)}s`);
        }
      }
    } catch (err) {
      console.warn('[usePersistentAudioState] Error loading last position:', err);
    }
  }, []);
  
  // Save last position periodically
  useEffect(() => {
    if (!isMediaPlaying) return;
    
    // Save position every 5 seconds during playback
    const saveInterval = setInterval(() => {
      try {
        // Use the audio element's currentTime if available (more accurate)
        const audioElement = document.querySelector('audio');
        if (audioElement) {
          const currentTime = audioElement.currentTime;
          if (currentTime > 0 && isFinite(currentTime)) {
            sessionStorage.setItem('radio-last-position', currentTime.toString());
            setLastPlaybackPosition(currentTime);
          }
        }
      } catch (err) {
        console.warn('[usePersistentAudioState] Error saving position:', err);
      }
    }, 5000);
    
    return () => clearInterval(saveInterval);
  }, [isMediaPlaying]);
  
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
  }, [setActiveMediaRoute, activeMediaRoute, setIsMediaPlaying]);

  // Update the media-playing session storage when isMediaPlaying changes
  useEffect(() => {
    sessionStorage.setItem('media-playing', isMediaPlaying.toString());
  }, [isMediaPlaying]);

  return {
    isActiveMediaRoute: activeMediaRoute === '/radio',
    isMediaPlaying,
    setIsMediaPlaying,
    lastPlaybackPosition
  };
};
