
/**
 * Utility for managing and cleaning up resources to prevent memory leaks
 */
export class ResourceManager {
  private urlObjects: Set<string> = new Set();
  private intervals: Set<number> = new Set();
  private timeouts: Set<number> = new Set();
  private cleanupFunctions: Set<() => void> = new Set();

  /**
   * Tracks a URL object for later cleanup
   */
  trackUrl(url: string): void {
    this.urlObjects.add(url);
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
      URL.revokeObjectURL(url);
      this.urlObjects.delete(url);
    }
  }

  /**
   * Removes a specific cleanup function from tracking without executing it
   */
  unregisterCleanup(fn: () => void): void {
    this.cleanupFunctions.delete(fn);
  }

  /**
   * Cleans up all tracked resources
   */
  cleanup(): void {
    // Revoke all URL objects
    this.urlObjects.forEach(url => {
      URL.revokeObjectURL(url);
    });
    this.urlObjects.clear();

    // Clear all intervals
    this.intervals.forEach(id => {
      window.clearInterval(id);
    });
    this.intervals.clear();

    // Clear all timeouts
    this.timeouts.forEach(id => {
      window.clearTimeout(id);
    });
    this.timeouts.clear();

    // Run all cleanup functions
    this.cleanupFunctions.forEach(fn => {
      try {
        fn();
      } catch (error) {
        console.error('Error in cleanup function:', error);
      }
    });
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
      managerRef.current?.cleanup();
    };
  }, []);
  
  return managerRef.current;
}
