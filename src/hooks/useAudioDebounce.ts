
import { useRef, useCallback } from 'react';

/**
 * Hook for creating debounced functions that prevent rapid consecutive calls
 * Specifically tuned for audio control interactions with enhancements for mobile
 */
export function useAudioDebounce() {
  const lastActionTimeRef = useRef<Record<string, number>>({});
  const isActionInProgressRef = useRef<Record<string, boolean>>({});

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
      
      // If action is in progress, block it entirely
      if (isActionInProgressRef.current[actionId]) {
        console.log(`[useAudioDebounce] Action '${actionId}' already in progress, blocking`);
        return;
      }
      
      // Check time since last action
      if (!lastActionTimeRef.current[actionId] || now - lastActionTimeRef.current[actionId] > delay) {
        lastActionTimeRef.current[actionId] = now;
        
        // Mark action as in progress
        isActionInProgressRef.current[actionId] = true;
        
        // Set a timeout to reset the in-progress flag
        setTimeout(() => {
          isActionInProgressRef.current[actionId] = false;
        }, Math.min(delay, 50)); // Use either the delay or 50ms, whichever is shorter
        
        // Execute the function
        return fn(...args);
      }
      
      // Action was debounced, don't execute
      console.log(`[useAudioDebounce] Action '${actionId}' debounced`);
      return;
    };
  }, []);

  /**
   * Create a throttled function (allows execution at regular intervals)
   * @param fn Function to throttle
   * @param actionId Identifier for the action
   * @param interval Minimum time between executions
   * @returns Throttled function
   */
  const throttle = useCallback(<T extends (...args: any[]) => any>(
    fn: T,
    actionId: string = 'default',
    interval: number = 100
  ) => {
    return (...args: Parameters<T>) => {
      const now = Date.now();
      
      if (!lastActionTimeRef.current[actionId] || now - lastActionTimeRef.current[actionId] > interval) {
        lastActionTimeRef.current[actionId] = now;
        return fn(...args);
      }
      
      // Action was throttled
      console.log(`[useAudioDebounce] Action '${actionId}' throttled`);
    };
  }, []);

  return { debounce, throttle };
}
