
import { useState, useRef, useEffect } from 'react';

interface StickyStateOptions {
  persistKey?: string;
  defaultSticky?: boolean;
  storage?: 'localStorage' | 'sessionStorage';
}

export function useStickyState(options: StickyStateOptions = {}) {
  const { persistKey, defaultSticky = false, storage = 'localStorage' } = options;
  const storageKey = persistKey ? `sticky-${persistKey}` : null;
  
  const [isSticky, setIsSticky] = useState(() => {
    if (!storageKey) return defaultSticky;
    
    try {
      const storedValue = window[storage].getItem(storageKey);
      return storedValue !== null ? JSON.parse(storedValue) : defaultSticky;
    } catch (error) {
      console.error('Error reading sticky state from storage:', error);
      return defaultSticky;
    }
  });
  
  const stickyRef = useRef<HTMLDivElement>(null);
  
  // Store sticky state in storage when it changes
  useEffect(() => {
    if (!storageKey) return;
    
    try {
      window[storage].setItem(storageKey, JSON.stringify(isSticky));
    } catch (error) {
      console.error('Error storing sticky state:', error);
    }
  }, [isSticky, storageKey, storage]);
  
  // Toggle sticky state
  const toggleSticky = () => {
    setIsSticky(prev => !prev);
  };
  
  // Clear sticky state from storage when component unmounts
  useEffect(() => {
    return () => {
      if (storageKey && isSticky === false) {
        try {
          window[storage].removeItem(storageKey);
        } catch (error) {
          console.error('Error removing sticky state from storage:', error);
        }
      }
    };
  }, [storageKey, isSticky, storage]);
  
  return { isSticky, stickyRef, toggleSticky };
}
