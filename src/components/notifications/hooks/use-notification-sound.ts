
import { useRef, useEffect } from "react";

/**
 * Hook for notification sound management
 */
export function useNotificationSound() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio element for notification sounds
  useEffect(() => {
    try {
      audioRef.current = new Audio("/notification-sound.mp3");
      audioRef.current.volume = 0.5;
      audioRef.current.preload = "auto";
    } catch (error) {
      console.error("Error setting up notification sound:", error);
    }
  }, []);

  // Play notification sound
  const playNotificationSound = () => {
    try {
      if (audioRef.current) {
        // Clone and play to allow overlapping sounds
        const sound = audioRef.current.cloneNode() as HTMLAudioElement;
        sound.volume = 0.5;
        sound.play().catch(e => console.log("Could not play notification sound", e));
      }
    } catch (error) {
      console.error("Error playing notification sound:", error);
    }
  };

  return { playNotificationSound };
}
