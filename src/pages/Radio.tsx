
import { useEffect } from "react";
import RadioContainer from "@/components/radio/RadioContainer";
import { useStickyState } from "@/hooks/use-sticky-state";

const Radio = () => {
  // Use sticky state to track if we've cleaned up this session
  const { isSticky: hasCleanedUp, toggleSticky: setHasCleanedUp } = useStickyState({
    persistKey: "radio-cleanup",
    defaultSticky: false,
    storage: 'sessionStorage'
  });
  
  // Clean up on component mount and unmount
  useEffect(() => {
    // If we haven't cleaned up yet, clean up sessionStorage
    if (!hasCleanedUp) {
      // Clear any orphaned file previews from sessionStorage
      try {
        // We'll use the cleanup flag to ensure we only clean up once per session
        setHasCleanedUp();
        
        // Clear any old entries in session storage related to radio
        const keysToRemove = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key && key.startsWith('radio-')) {
            keysToRemove.push(key);
          }
        }
        
        // Remove the keys in a separate loop to avoid issues with changing sessionStorage during iteration
        keysToRemove.forEach(key => {
          sessionStorage.removeItem(key);
        });
        
        console.log('Radio session cleaned up successfully');
      } catch (error) {
        console.error("Error cleaning up radio session:", error);
      }
    }
    
    // Clean up on unmount
    return () => {
      // This will handle cleanup when navigating away
      setHasCleanedUp();
    };
  }, [hasCleanedUp, setHasCleanedUp]);

  return <RadioContainer />;
};

export default Radio;
