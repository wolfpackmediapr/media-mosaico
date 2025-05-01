
import { useCallback } from "react";

/**
 * Hook for playing notification sounds
 */
export function useNotificationSound() {
  // Play notification sound with proper error handling and volume control
  const playNotificationSound = useCallback(() => {
    try {
      const audio = new Audio("/notification-sound.mp3");
      audio.volume = 0.5; // Lower volume to be less intrusive
      
      // Use catch to handle autoplay restrictions
      audio.play().catch((e) => {
        console.log("Could not play notification sound:", e);
      });
    } catch (error) {
      console.error("Error playing notification sound:", error);
    }
  }, []);

  return { playNotificationSound };
}
