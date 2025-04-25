
import { useEffect } from "react";
import { useMediaPersistence } from "@/context/MediaPersistenceContext";

export const usePersistentVideoState = () => {
  const { activeMediaRoute, setActiveMediaRoute, isMediaPlaying, setIsMediaPlaying } = useMediaPersistence();
  
  // Register this component as the active media route
  useEffect(() => {
    setActiveMediaRoute('/tv');
    
    // Cleanup when unmounting
    return () => {
      // Only clear if we're the active route
      if (activeMediaRoute === '/tv') {
        // We don't clear the active route here
      }
    };
  }, []);

  return {
    isActiveMediaRoute: activeMediaRoute === '/tv',
    isMediaPlaying,
    setIsMediaPlaying
  };
};
