
import { useRef } from "react";

/**
 * Hook for preventing duplicate notifications within a short timeframe
 */
export function useNotificationDeduplication() {
  const lastNotificationTimeRef = useRef<Record<string, number>>({});
  
  // Prevent duplicate notifications within a short timeframe
  const shouldShowNotification = (id: string, timeThreshold = 5000): boolean => {
    const now = Date.now();
    const lastTime = lastNotificationTimeRef.current[id] || 0;
    
    // Prevent duplicate notifications within specified time threshold
    if (now - lastTime < timeThreshold) {
      console.log(`Suppressing duplicate notification: ${id}`);
      return false;
    }
    
    lastNotificationTimeRef.current[id] = now;
    return true;
  };

  return { shouldShowNotification };
}
