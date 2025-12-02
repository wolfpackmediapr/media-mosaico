import { useState, useEffect, useRef } from 'react';

type StorageType = 'localStorage' | 'sessionStorage';

export interface PersistOptions {
  storage?: StorageType;
  serialize?: (value: any) => string;
  deserialize?: (value: string) => any;
}

/**
 * Hook for persisting state in localStorage or sessionStorage
 * Fixed: Added skipNextWriteRef to prevent race conditions during removeItem()
 */
export function usePersistentState<T>(
  key: string,
  initialValue: T,
  options: PersistOptions = {}
): [T, (value: T | ((val: T) => T)) => void, () => void] {
  
  // Use provided options or defaults
  const {
    storage = 'localStorage',
    serialize = JSON.stringify,
    deserialize = JSON.parse,
  } = options;
  
  // Get the storage object (localStorage or sessionStorage)
  const storageObject = window[storage];
  
  // CRITICAL FIX: Flag to skip the next write after removeItem
  // This prevents the useEffect from re-writing initialValue back to storage
  const skipNextWriteRef = useRef(false);
  
  // Initialize state with persisted value or initial value
  const [state, setState] = useState<T>(() => {
    try {
      const storedValue = storageObject.getItem(key);
      console.log(`[usePersistentState] [${storage}] READ "${key}":`, storedValue);
      
      // Handle special case: literal string "undefined" should be treated as undefined
      if (storedValue === null || storedValue === 'undefined' || storedValue === '') {
        return initialValue;
      }
      
      return deserialize(storedValue);
    } catch (error) {
      console.error(`[usePersistentState] [${storage}] Error reading "${key}":`, error);
      return initialValue;
    }
  });
  
  // Update storage when state changes
  useEffect(() => {
    // CRITICAL FIX: Skip write if we just cleared via removeItem
    if (skipNextWriteRef.current) {
      skipNextWriteRef.current = false;
      console.log(`[usePersistentState] [${storage}] SKIPPED write for "${key}" (removeItem in progress)`);
      return;
    }
    
    try {
      storageObject.setItem(key, serialize(state));
      console.log(`[usePersistentState] [${storage}] SET "${key}" =`, state);
    } catch (error) {
      console.error(`[usePersistentState] [${storage}] Error writing "${key}":`, error);
    }
  }, [key, state, serialize, storageObject]);
  
  // Function to clear this specific stored value
  const removeItem = () => {
    try {
      // CRITICAL FIX: Set flag BEFORE clearing to prevent useEffect re-write
      skipNextWriteRef.current = true;
      storageObject.removeItem(key);
      setState(initialValue);
      console.log(`[usePersistentState] [${storage}] REMOVE "${key}"`);
    } catch (error) {
      console.error(`[usePersistentState] [${storage}] Error removing "${key}":`, error);
      skipNextWriteRef.current = false; // Reset on error
    }
  };
  
  return [state, setState, removeItem];
}
