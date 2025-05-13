
import { useEffect, useRef } from 'react';

/**
 * Utility hook for tracking and cleaning up resources like blob URLs
 * Ensures URLs are properly revoked when components unmount
 */
export const useResourceManager = () => {
  const urlsToCleanup = useRef<Set<string>>(new Set());
  
  // Track a URL to be revoked on cleanup
  const trackUrl = (url: string) => {
    if (!url || !url.startsWith('blob:')) return;
    urlsToCleanup.current.add(url);
  };
  
  // Manually revoke a tracked URL
  const revokeUrl = (url: string) => {
    if (!url || !url.startsWith('blob:')) return;
    
    try {
      URL.revokeObjectURL(url);
      urlsToCleanup.current.delete(url);
    } catch (error) {
      console.error('[ResourceManager] Error revoking URL:', error);
    }
  };
  
  // Cleanup all tracked URLs
  const cleanup = () => {
    urlsToCleanup.current.forEach(url => {
      try {
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error('[ResourceManager] Error during cleanup:', error);
      }
    });
    urlsToCleanup.current.clear();
  };
  
  // Auto-cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, []);
  
  return {
    trackUrl,
    revokeUrl,
    cleanup
  };
};
