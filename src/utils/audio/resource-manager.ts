
/**
 * Audio resource management utilities
 * Provides hooks and functions for tracking and cleaning up audio resources
 */
import { useEffect, useRef } from 'react';
import { safelyRevokeBlobUrl } from './url-validator';
import { disposeAudioElement } from './audio-element-factory';

/**
 * Utility hook for tracking and cleaning up resources like blob URLs
 * Ensures URLs are properly revoked when components unmount
 */
export const useResourceManager = () => {
  const urlsToCleanup = useRef<Set<string>>(new Set());
  const audioElementsToCleanup = useRef<Set<HTMLAudioElement>>(new Set());
  
  // Track a URL to be revoked on cleanup
  const trackUrl = (url: string) => {
    if (!url || !url.startsWith('blob:')) return;
    urlsToCleanup.current.add(url);
  };
  
  // Track an audio element to be disposed on cleanup
  const trackAudioElement = (audioElement: HTMLAudioElement) => {
    if (!audioElement) return;
    audioElementsToCleanup.current.add(audioElement);
  };
  
  // Manually revoke a tracked URL
  const revokeUrl = (url: string) => {
    if (!url || !url.startsWith('blob:')) return;
    
    try {
      safelyRevokeBlobUrl(url);
      urlsToCleanup.current.delete(url);
    } catch (error) {
      console.error('[ResourceManager] Error revoking URL:', error);
    }
  };
  
  // Manually dispose a tracked audio element
  const disposeAudio = (audioElement: HTMLAudioElement) => {
    try {
      disposeAudioElement(audioElement);
      audioElementsToCleanup.current.delete(audioElement);
    } catch (error) {
      console.error('[ResourceManager] Error disposing audio element:', error);
    }
  };
  
  // Cleanup all tracked resources
  const cleanup = () => {
    // Clean up URLs
    urlsToCleanup.current.forEach(url => {
      try {
        safelyRevokeBlobUrl(url);
      } catch (error) {
        console.error('[ResourceManager] Error during URL cleanup:', error);
      }
    });
    urlsToCleanup.current.clear();
    
    // Clean up audio elements
    audioElementsToCleanup.current.forEach(audioElement => {
      try {
        disposeAudioElement(audioElement);
      } catch (error) {
        console.error('[ResourceManager] Error during audio element cleanup:', error);
      }
    });
    audioElementsToCleanup.current.clear();
  };
  
  // Auto-cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, []);
  
  return {
    trackUrl,
    trackAudioElement,
    revokeUrl,
    disposeAudio,
    cleanup
  };
};

/**
 * Creates a one-time resource cleanup function
 * Useful for non-hook contexts
 */
export const createResourceCleaner = () => {
  const urlsToCleanup = new Set<string>();
  const audioElementsToCleanup = new Set<HTMLAudioElement>();
  
  return {
    trackUrl: (url: string) => {
      if (!url || !url.startsWith('blob:')) return;
      urlsToCleanup.add(url);
    },
    
    trackAudioElement: (audioElement: HTMLAudioElement) => {
      if (!audioElement) return;
      audioElementsToCleanup.add(audioElement);
    },
    
    cleanup: () => {
      // Clean up URLs
      urlsToCleanup.forEach(url => {
        try {
          safelyRevokeBlobUrl(url);
        } catch (error) {
          console.error('[ResourceCleaner] Error during URL cleanup:', error);
        }
      });
      urlsToCleanup.clear();
      
      // Clean up audio elements
      audioElementsToCleanup.forEach(audioElement => {
        try {
          disposeAudioElement(audioElement);
        } catch (error) {
          console.error('[ResourceCleaner] Error during audio element cleanup:', error);
        }
      });
      audioElementsToCleanup.clear();
    }
  };
};
