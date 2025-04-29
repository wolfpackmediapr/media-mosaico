
import { useEffect, useRef } from "react";
import { unmuteAudio } from "@/utils/audio-format-helper";

/**
 * Hook to handle unlocking the browser's audio context on the first user interaction.
 */
export const useAudioUnlock = () => {
  const audioUnlockAttempted = useRef<boolean>(false);

  useEffect(() => {
    if (!audioUnlockAttempted.current) {
      const unlockAudio = () => {
        if (!audioUnlockAttempted.current) {
          console.log("[useAudioUnlock] Attempting to unlock audio context.");
          audioUnlockAttempted.current = true;
          unmuteAudio();
          // Remove listeners once unlocked
          document.removeEventListener('click', unlockAudio);
          document.removeEventListener('touchend', unlockAudio);
          document.removeEventListener('keydown', unlockAudio);
        }
      };

      // Listen for common interaction events
      document.addEventListener('click', unlockAudio, { once: true, capture: true });
      document.addEventListener('touchend', unlockAudio, { once: true, capture: true });
      document.addEventListener('keydown', unlockAudio, { once: true, capture: true });

      // Cleanup function
      return () => {
        document.removeEventListener('click', unlockAudio);
        document.removeEventListener('touchend', unlockAudio);
        document.removeEventListener('keydown', unlockAudio);
      };
    }
  }, []);

  // Return the unlock function in case it's needed manually (optional)
  return { attemptAudioUnlock: unmuteAudio };
};
