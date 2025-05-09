
/**
 * Utility for managing and cleaning up resources to prevent memory leaks
 */
export class ResourceManager {
  private urlObjects: Set<string> = new Set();
  private intervals: Set<number> = new Set();
  private timeouts: Set<number> = new Set();
  private cleanupFunctions: Set<() => void> = new Set();
  private abortControllers: Set<AbortController> = new Set();

  /**
   * Tracks a URL object for later cleanup
   */
  trackUrl(url: string): void {
    if (url && url.startsWith('blob:')) {
      this.urlObjects.add(url);
    }
  }

  /**
   * Creates and tracks a setInterval
   */
  setInterval(callback: () => void, ms: number): number {
    const id = window.setInterval(callback, ms);
    this.intervals.add(id);
    return id;
  }

  /**
   * Creates and tracks a setTimeout
   */
  setTimeout(callback: () => void, ms: number): number {
    const id = window.setTimeout(callback, ms);
    this.timeouts.add(id);
    return id;
  }

  /**
   * Creates and tracks an AbortController
   */
  createAbortController(): AbortController {
    const controller = new AbortController();
    this.abortControllers.add(controller);
    return controller;
  }

  /**
   * Registers any cleanup function
   */
  registerCleanup(fn: () => void): void {
    this.cleanupFunctions.add(fn);
  }

  /**
   * Clears a specific interval and removes it from tracking
   */
  clearInterval(id: number): void {
    window.clearInterval(id);
    this.intervals.delete(id);
  }

  /**
   * Clears a specific timeout and removes it from tracking
   */
  clearTimeout(id: number): void {
    window.clearTimeout(id);
    this.timeouts.delete(id);
  }

  /**
   * Revokes a specific URL object and removes it from tracking
   */
  revokeUrl(url: string): void {
    if (this.urlObjects.has(url)) {
      try {
        URL.revokeObjectURL(url);
        this.urlObjects.delete(url);
      } catch (error) {
        console.warn('Error revoking URL:', error);
      }
    }
  }

  /**
   * Abort a specific controller and remove it from tracking
   */
  abortController(controller: AbortController): void {
    if (this.abortControllers.has(controller)) {
      controller.abort();
      this.abortControllers.delete(controller);
    }
  }

  /**
   * Removes a specific cleanup function from tracking without executing it
   */
  unregisterCleanup(fn: () => void): void {
    this.cleanupFunctions.delete(fn);
  }

  /**
   * Cleans up all tracked resources in batches to prevent UI freezes
   */
  async cleanup(): Promise<void> {
    // Abort all controllers first
    if (this.abortControllers.size > 0) {
      for (const controller of this.abortControllers) {
        controller.abort();
      }
      this.abortControllers.clear();
      // Give the browser a chance to process aborts
      await new Promise(resolve => setTimeout(resolve, 20));
    }

    // Clear all intervals
    if (this.intervals.size > 0) {
      for (const id of this.intervals) {
        window.clearInterval(id);
      }
      this.intervals.clear();
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    // Clear all timeouts
    if (this.timeouts.size > 0) {
      for (const id of this.timeouts) {
        window.clearTimeout(id);
      }
      this.timeouts.clear();
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    // Revoke URL objects in batches
    const urlBatchSize = 3;
    const urlArray = Array.from(this.urlObjects);
    
    for (let i = 0; i < urlArray.length; i += urlBatchSize) {
      const batch = urlArray.slice(i, i + urlBatchSize);
      for (const url of batch) {
        try {
          URL.revokeObjectURL(url);
        } catch (error) {
          console.warn('Error revoking URL in batch cleanup:', error);
        }
      }
      // Give the browser time to process between batches
      await new Promise(resolve => setTimeout(resolve, 20));
    }
    this.urlObjects.clear();

    // Run cleanup functions in batches
    const fnBatchSize = 2;
    const fnArray = Array.from(this.cleanupFunctions);
    
    for (let i = 0; i < fnArray.length; i += fnBatchSize) {
      const batch = fnArray.slice(i, i + fnBatchSize);
      for (const fn of batch) {
        try {
          fn();
        } catch (error) {
          console.error('Error in cleanup function:', error);
        }
      }
      // Give the browser time to process between batches
      await new Promise(resolve => setTimeout(resolve, 30));
    }
    this.cleanupFunctions.clear();
  }
}

/**
 * Hook to use ResourceManager in React components
 */
import { useEffect, useRef } from 'react';

export function useResourceManager(): ResourceManager {
  const managerRef = useRef<ResourceManager | null>(null);
  
  if (managerRef.current === null) {
    managerRef.current = new ResourceManager();
  }
  
  useEffect(() => {
    return () => {
      // Use async IIFE to allow for batched cleanup
      (async () => {
        await managerRef.current?.cleanup();
      })();
    };
  }, []);
  
  return managerRef.current;
}
