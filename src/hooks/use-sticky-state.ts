
import { useState, useEffect, useRef } from 'react';
import { usePersistentState } from './use-persistent-state';

interface StickyOptions {
  persistKey?: string;
  defaultSticky?: boolean;
  persistInSession?: boolean;
}

/**
 * Hook for managing sticky UI components that can be toggled and persisted
 */
export function useStickyState(options: StickyOptions = {}) {
  const {
    persistKey,
    defaultSticky = false,
    persistInSession = true,
  } = options;
  
  // If persistKey is provided, use persistent storage
  const [isSticky, setIsSticky] = persistKey 
    ? usePersistentState(
        `sticky-${persistKey}`,
        defaultSticky,
        { storage: persistInSession ? 'sessionStorage' : 'localStorage' }
      )
    : useState(defaultSticky);
  
  // Ref to the sticky element
  const stickyRef = useRef<HTMLDivElement>(null);
  
  // Toggle sticky state
  const toggleSticky = () => setIsSticky(!isSticky);
  
  // Scroll the sticky element into view when needed
  const scrollIntoView = (options: ScrollIntoViewOptions = { behavior: 'smooth' }) => {
    if (stickyRef.current && isSticky) {
      stickyRef.current.scrollIntoView(options);
    }
  };
  
  return {
    isSticky,
    setIsSticky,
    toggleSticky,
    stickyRef,
    scrollIntoView
  };
}
