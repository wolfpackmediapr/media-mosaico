
import { useRef, useCallback } from 'react';

/**
 * Hook for creating debounced functions that prevent rapid consecutive calls
 * Specifically tuned for audio control interactions
 */
export function useAudioDebounce() {
  const lastActionTimeRef = useRef<Record<string, number>>({});

  /**
   * Create a debounced function
   * @param fn Function to debounce
   * @param actionId Identifier for the action (to track separate actions)
   * @param delay Debounce delay in ms
   * @returns Debounced function
   */
  const debounce = useCallback(<T extends (...args: any[]) => any>(
    fn: T,
    actionId: string = 'default',
    delay: number = 300
  ) => {
    return (...args: Parameters<T>) => {
      const now = Date.now();
      
      if (!lastActionTimeRef.current[actionId] || now - lastActionTimeRef.current[actionId] > delay) {
        lastActionTimeRef.current[actionId] = now;
        return fn(...args);
      }
      
      // Action was debounced, don't execute
      console.log(`[useAudioDebounce] Action '${actionId}' debounced`);
      return;
    };
  }, []);

  return { debounce };
}
