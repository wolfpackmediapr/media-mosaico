
import { useEffect } from "react";
import { useMediaPersistence } from "@/context/MediaPersistenceContext";

export const usePersistentAudioState = () => {
  const { activeMediaRoute, setActiveMediaRoute, isMediaPlaying, setIsMediaPlaying } = useMediaPersistence();
  
  // Set this component as the active media route when mounted
  useEffect(() => {
    // Register this component as the active media route
    setActiveMediaRoute('/radio');
    
    // Cleanup when unmounting
    return () => {
      // Only clear if we're the active route
      if (activeMediaRoute === '/radio') {
        // We don't clear the active route here so that the player stays "active"
        // even when navigating away
      }
    };
  }, []);

  return {
    isActiveMediaRoute: activeMediaRoute === '/radio',
    isMediaPlaying,
    setIsMediaPlaying
  };
};
