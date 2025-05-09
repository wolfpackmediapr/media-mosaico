
/**
 * Utility for managing and cleaning up resources to prevent memory leaks
 */
export class ResourceManager {
  private urlObjects: Set<string> = new Set();
  private intervals: Set<number> = new Set();
  private timeouts: Set<number> = new Set();
  private cleanupFunctions: Set<() => void> = new Set();
  private cleanupInProgress: boolean = false;

  /**
   * Tracks a URL object for later cleanup
   */
  trackUrl(url: string): void {
    if (!url || typeof url !== 'string' || !url.startsWith('blob:')) {
      console.warn("[ResourceManager] Attempted to track invalid URL:", url);
      return;
    }
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
    if (!url || typeof url !== 'string' || !url.startsWith('blob:')) {
      return;
    }
    
    if (this.urlObjects.has(url)) {
      try {
        URL.revokeObjectURL(url);
      } catch (e) {
        console.warn("[ResourceManager] Error revoking URL:", e);
      } finally {
        this.urlObjects.delete(url);
      }
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
    if (this.cleanupInProgress) {
      console.warn("[ResourceManager] Cleanup already in progress, skipping duplicate call");
      return;
    }
    
    this.cleanupInProgress = true;
    
    try {
      // Revoke all URL objects
      this.urlObjects.forEach(url => {
        try {
          URL.revokeObjectURL(url);
        } catch (error) {
          console.warn("[ResourceManager] Error revoking URL:", error);
        }
      });
      this.urlObjects.clear();

      // Clear all intervals
      this.intervals.forEach(id => {
        try {
          window.clearInterval(id);
        } catch (error) {
          console.warn("[ResourceManager] Error clearing interval:", error);
        }
      });
      this.intervals.clear();

      // Clear all timeouts
      this.timeouts.forEach(id => {
        try {
          window.clearTimeout(id);
        } catch (error) {
          console.warn("[ResourceManager] Error clearing timeout:", error);
        }
      });
      this.timeouts.clear();

      // Run all cleanup functions
      this.cleanupFunctions.forEach(fn => {
        try {
          fn();
        } catch (error) {
          console.error('[ResourceManager] Error in cleanup function:', error);
        }
      });
      this.cleanupFunctions.clear();
      
      // Force a garbage collection hint by setting large objects to null
      // This doesn't guarantee GC will run but can help
      if (window.gc) {
        try {
          window.gc();
        } catch (e) {
          // Ignore - gc() is not available in all browsers
        }
      }
    } catch (e) {
      console.error("[ResourceManager] Unexpected error during cleanup:", e);
    } finally {
      this.cleanupInProgress = false;
    }
  }
  
  /**
   * Safe cleanup that runs in chunks to avoid freezing
   */
  async cleanupAsync(): Promise<void> {
    if (this.cleanupInProgress) {
      console.warn("[ResourceManager] Cleanup already in progress, skipping duplicate call");
      return;
    }
    
    this.cleanupInProgress = true;
    
    try {
      // Process URL objects in chunks of 10
      const urlArray = Array.from(this.urlObjects);
      for (let i = 0; i < urlArray.length; i += 10) {
        const chunk = urlArray.slice(i, i + 10);
        for (const url of chunk) {
          try {
            URL.revokeObjectURL(url);
            this.urlObjects.delete(url);
          } catch (error) {
            console.warn("[ResourceManager] Error revoking URL:", error);
            this.urlObjects.delete(url); // Remove anyway to avoid retrying
          }
        }
        // Yield to the browser's event loop after each chunk
        await new Promise(resolve => setTimeout(resolve, 5));
      }
      
      // Process intervals in chunks
      const intervalArray = Array.from(this.intervals);
      for (let i = 0; i < intervalArray.length; i += 20) {
        const chunk = intervalArray.slice(i, i + 20);
        for (const id of chunk) {
          try {
            window.clearInterval(id);
            this.intervals.delete(id);
          } catch (error) {
            console.warn("[ResourceManager] Error clearing interval:", error);
            this.intervals.delete(id);
          }
        }
        await new Promise(resolve => setTimeout(resolve, 5));
      }
      
      // Process timeouts in chunks
      const timeoutArray = Array.from(this.timeouts);
      for (let i = 0; i < timeoutArray.length; i += 20) {
        const chunk = timeoutArray.slice(i, i + 20);
        for (const id of chunk) {
          try {
            window.clearTimeout(id);
            this.timeouts.delete(id);
          } catch (error) {
            console.warn("[ResourceManager] Error clearing timeout:", error);
            this.timeouts.delete(id);
          }
        }
        await new Promise(resolve => setTimeout(resolve, 5));
      }
      
      // Process cleanup functions in chunks
      const fnArray = Array.from(this.cleanupFunctions);
      for (let i = 0; i < fnArray.length; i += 5) {
        const chunk = fnArray.slice(i, i + 5);
        for (const fn of chunk) {
          try {
            fn();
            this.cleanupFunctions.delete(fn);
          } catch (error) {
            console.error('[ResourceManager] Error in cleanup function:', error);
            this.cleanupFunctions.delete(fn);
          }
        }
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    } catch (e) {
      console.error("[ResourceManager] Unexpected error during async cleanup:", e);
    } finally {
      this.cleanupInProgress = false;
    }
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
      // Use async cleanup when available, fall back to sync
      if (managerRef.current) {
        managerRef.current.cleanupAsync().catch(() => {
          managerRef.current?.cleanup();
        });
      }
    };
  }, []);
  
  return managerRef.current;
}
