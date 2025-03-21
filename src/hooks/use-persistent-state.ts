
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
      return storedValue ? deserialize(storedValue) : initialValue;
    } catch (error) {
      console.error(`Error reading from ${storage}:`, error);
      return initialValue;
    }
  });
  
  // Update storage when state changes
  useEffect(() => {
    try {
      storageObject.setItem(key, serialize(state));
    } catch (error) {
      console.error(`Error writing to ${storage}:`, error);
    }
  }, [key, state, serialize, storageObject]);
  
  // Function to clear this specific stored value
  const removeItem = () => {
    try {
      storageObject.removeItem(key);
      setState(initialValue);
    } catch (error) {
      console.error(`Error removing from ${storage}:`, error);
    }
  };
  
  return [state, setState, removeItem];
}
