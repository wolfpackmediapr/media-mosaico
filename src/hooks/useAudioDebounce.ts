import { useRef, useCallback } from 'react';

interface UseAudioDebounceReturn {
  debounce: <T extends (...args: any[]) => void>(
    fn: T,
    id?: string,
    delay?: number
  ) => (...args: Parameters<T>) => void;
  cancelAll: () => void;
}

/**
 * Hook that provides debouncing functionality for audio controls
 * to prevent rapid clicking causing state inconsistencies
 */
export function useAudioDebounce(): UseAudioDebounceReturn {
  // Track last action times by ID to allow multiple debounced functions
  const lastActionTimeRef = useRef<Record<string, number>>({});
  
  // Track timeout IDs for cleanup
  const timeoutsRef = useRef<Record<string, NodeJS.Timeout>>({});
  
  // Function to cancel all pending debounced actions
  const cancelAll = useCallback(() => {
    Object.values(timeoutsRef.current).forEach(timeout => {
      clearTimeout(timeout);
    });
    timeoutsRef.current = {};
  }, []);

  // Create a debounced version of a function
  const debounce = useCallback(<T extends (...args: any[]) => void>(
    fn: T,
    id: string = 'default',
    delay: number = 300
  ) => {
    return (...args: Parameters<T>) => {
      const now = Date.now();
      const lastTime = lastActionTimeRef.current[id] || 0;
      
      // If an existing timeout is pending for this ID, clear it
      if (timeoutsRef.current[id]) {
        clearTimeout(timeoutsRef.current[id]);
      }
      
      // If enough time has passed since the last action, execute immediately
      if (now - lastTime > delay) {
        lastActionTimeRef.current[id] = now;
        fn(...args);
      } else {
        // Otherwise schedule for later and log the debounce
        console.log(`[useAudioDebounce] Action "${id}" debounced, scheduling for later`);
        timeoutsRef.current[id] = setTimeout(() => {
          lastActionTimeRef.current[id] = Date.now();
          fn(...args);
        }, delay);
      }
    };
  }, []);

  return { debounce, cancelAll };
}
