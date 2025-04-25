
import { useState, useRef, useEffect } from 'react';
import { usePersistentState } from './use-persistent-state';

interface StickySateOptions {
  persistKey?: string;
  defaultSticky?: boolean;
  storage?: 'localStorage' | 'sessionStorage';
}

/**
 * Hook for creating UI components that can be "sticky" or detached
 * from their original position (like picture-in-picture mode)
 */
export function useStickyState(options: StickySateOptions = {}) {
  const {
    persistKey,
    defaultSticky = false,
    storage = 'sessionStorage'
  } = options;

  // Use persistent state if key is provided
  const [isSticky, setIsSticky] = persistKey 
    ? usePersistentState(persistKey, defaultSticky, { storage })
    : useState(defaultSticky);

  const stickyRef = useRef<HTMLDivElement>(null);
  
  // Toggle sticky state
  const toggleSticky = () => setIsSticky(!isSticky);
  
  // Set sticky state explicitly
  const setSticky = (sticky: boolean) => setIsSticky(sticky);
  
  // Effect to handle click outside sticky element to restore
  useEffect(() => {
    if (!isSticky) return;
    
    const handleClickOutside = (event: MouseEvent) => {
      if (stickyRef.current && !stickyRef.current.contains(event.target as Node)) {
        // Uncomment below line if you want clicking outside to restore position
        // setIsSticky(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSticky, setIsSticky]);
  
  return {
    isSticky,
    setIsSticky: setSticky,
    toggleSticky,
    stickyRef
  };
}
