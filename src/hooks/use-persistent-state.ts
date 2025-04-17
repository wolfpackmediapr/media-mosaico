import { useState, useEffect } from 'react';

type StorageType = 'localStorage' | 'sessionStorage';

export interface PersistOptions {
  storage?: StorageType;
  serialize?: (value: any) => string;
  deserialize?: (value: string) => any;
}

/**
 * Hook for persisting state in localStorage or sessionStorage
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
  
  // Initialize state with persisted value or initial value
  const [state, setState] = useState<T>(() => {
    try {
      const storedValue = storageObject.getItem(key);
      console.log(`[usePersistentState] [${storage}] READ "${key}":`, storedValue);
      return storedValue ? deserialize(storedValue) : initialValue;
    } catch (error) {
      console.error(`[usePersistentState] [${storage}] Error reading "${key}":`, error);
      return initialValue;
    }
  });
  
  // Update storage when state changes
  useEffect(() => {
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
      storageObject.removeItem(key);
      setState(initialValue);
      console.log(`[usePersistentState] [${storage}] REMOVE "${key}"`);
    } catch (error) {
      console.error(`[usePersistentState] [${storage}] Error removing "${key}":`, error);
    }
  };
  
  return [state, setState, removeItem];
}
