
import { useEffect, useCallback, useRef } from "react";
import { unmuteAudio } from "@/utils/audio-format-helper";
import { Howler } from "howler";

/**
 * Hook to handle audio unlocking across browsers
 * This helps with browser autoplay restrictions
 */
export const useAudioUnlock = () => {
  const isUnlocked = useRef<boolean>(false);
  const unlockAttempts = useRef<number>(0);
  const nativeAudioRef = useRef<HTMLAudioElement | null>(null);
  
  // Initialize audio element for native audio check
  useEffect(() => {
    if (!nativeAudioRef.current) {
      nativeAudioRef.current = new Audio();
    }
    
    return () => {
      if (nativeAudioRef.current) {
        nativeAudioRef.current.src = '';
        nativeAudioRef.current = null;
      }
    };
  }, []);
  
  // Comprehensive audio unlock function
  const attemptAudioUnlock = useCallback(() => {
    if (isUnlocked.current) return true;
    
    try {
      // Try to unlock the standard Web Audio API
      unmuteAudio(); // Not checking return value, as it's void
      
      // Try to unlock Howler's audio context specifically
      try {
        if ((Howler as any).ctx && (Howler as any).ctx.state === 'suspended') {
          console.log('[useAudioUnlock] Attempting to resume Howler AudioContext');
          (Howler as any).ctx.resume().then(() => {
            console.log(`[useAudioUnlock] Howler AudioContext state: ${(Howler as any).ctx.state}`);
            isUnlocked.current = true;
          }).catch((err: any) => {
            console.warn('[useAudioUnlock] Failed to resume Howler AudioContext:', err);
          });
        }
        
        // Try to trigger Howler's unlock function if available
        if (typeof (Howler as any)._autoUnlock === 'function') {
          console.log('[useAudioUnlock] Calling Howler._autoUnlock()');
          (Howler as any)._autoUnlock();
        }
        
        // Try direct unlock for mobile Safari
        if (typeof (Howler as any)._unlockAudio === 'function') {
          console.log('[useAudioUnlock] Calling Howler._unlockAudio()');
          (Howler as any)._unlockAudio();
        }
      } catch (err) {
        console.warn('[useAudioUnlock] Error unlocking Howler audio:', err);
      }
      
      // Check for HTML5 audio unlock as well
      try {
        if (!nativeAudioRef.current) {
          nativeAudioRef.current = new Audio();
        }
        const audio = nativeAudioRef.current;
        audio.muted = true;
        
        // Create a very short audio for better unlocking
        audio.src = 'data:audio/mp3;base64,/+MYxAAAAANIAUAAAASEEB/jwOFM/0MM/90b/+RhST//w4NFwOjf///PZu////9lns5GFDv//l9GlUIEEIAAAgIg8Ir/JGq3/+MYxDsLIj5QMYcoAP0dv9HIjUcH//yYSg+CIbkGP//8w0bLVjUP///3Z0x5QCAv/yLjwtGKTEFNRTMuOTeqqqqqqqqqqqqq/+MYxEkNmdJkUYc4AKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq';
        
        // Just trying to play something can help unlock audio
        audio.play().then(() => {
          console.log('[useAudioUnlock] HTML5 Audio unlock successful');
          setTimeout(() => {
            audio.pause();
          }, 100);
          isUnlocked.current = true;
        }).catch(err => {
          console.warn('[useAudioUnlock] HTML5 Audio unlock failed:', err);
        });
      } catch (err) {
        console.warn('[useAudioUnlock] Error with HTML5 Audio unlock:', err);
      }
      
      // Increment attempt counter
      unlockAttempts.current++;
      
      // Consider successful after multiple attempts
      if (unlockAttempts.current >= 3) {
        isUnlocked.current = true;
        return true;
      }
      
      return false;
    } catch (err) {
      console.error('[useAudioUnlock] Error during audio unlock:', err);
      return false;
    }
  }, []);
  
  // Set up unlock listeners
  useEffect(() => {
    // Only try to set up if not already unlocked
    if (isUnlocked.current) return;
    
    const unlockEvents = ['touchstart', 'touchend', 'click', 'keydown'];
    
    // Handler to be called on user interaction
    const unlockHandler = () => {
      attemptAudioUnlock();
      
      // If we've succeeded, remove all the listeners
      if (isUnlocked.current) {
        unlockEvents.forEach(event => {
          document.removeEventListener(event, unlockHandler);
        });
      }
    };
    
    // Add interaction listeners
    unlockEvents.forEach(event => {
      document.addEventListener(event, unlockHandler);
    });
    
    // Attempt unlock immediately (might work if already interacted)
    attemptAudioUnlock();
    
    // Clean up listeners on unmount
    return () => {
      unlockEvents.forEach(event => {
        document.removeEventListener(event, unlockHandler);
      });
    };
  }, [attemptAudioUnlock]);
  
  // Return the unlock function so it can be called manually when needed
  return { 
    attemptAudioUnlock,
    isAudioUnlocked: isUnlocked.current
  };
};
