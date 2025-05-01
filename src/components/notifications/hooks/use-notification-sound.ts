
import { useCallback } from "react";

/**
 * Hook for playing notification sounds
 */
export function useNotificationSound() {
  // Play notification sound with proper error handling and volume control
  const playNotificationSound = useCallback(() => {
    try {
      // Create new audio instance for each play to avoid conflicts
      const audio = new Audio("/notification-sound.mp3");
      
      // Set reasonable volume level
      audio.volume = 0.5; // Lower volume to be less intrusive
      
      // Use catch to handle autoplay restrictions
      const playPromise = audio.play();
      
      // Modern browsers return a promise from play()
      if (playPromise !== undefined) {
        playPromise.catch((e) => {
          console.log("Could not play notification sound:", e);
          // Don't throw - this is an enhancement, not critical functionality
        });
      }
    } catch (error) {
      // Log but don't throw - notification sounds are non-critical
      console.error("Error playing notification sound:", error);
    }
  }, []);

  return { playNotificationSound };
}
