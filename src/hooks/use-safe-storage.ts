
import { useState, useCallback } from 'react';
import { toast } from "sonner";

interface SafeStorageOptions {
  onError?: (error: Error) => void;
  storage?: 'localStorage' | 'sessionStorage';
}

export function useSafeStorage(options: SafeStorageOptions = {}) {
  const { storage = 'sessionStorage', onError } = options;
  const [isClearing, setIsClearing] = useState(false);

  const storageObject = window[storage];

  const clearStorageKeys = useCallback(async (keys: string[]) => {
    setIsClearing(true);
    const failedKeys: string[] = [];

    try {
      // Check available space
      const testKey = '_storage_test_';
      try {
        storageObject.setItem(testKey, '1');
        storageObject.removeItem(testKey);
      } catch (e) {
        throw new Error('Storage is not available');
      }

      // Clear keys with retries
      for (const key of keys) {
        try {
          storageObject.removeItem(key);
        } catch (error) {
          console.error(`Error clearing key ${key}:`, error);
          failedKeys.push(key);
        }
      }

      // Retry failed keys once
      if (failedKeys.length > 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
        for (const key of failedKeys) {
          try {
            storageObject.removeItem(key);
            const index = failedKeys.indexOf(key);
            if (index > -1) {
              failedKeys.splice(index, 1);
            }
          } catch (error) {
            console.error(`Retry failed for key ${key}:`, error);
          }
        }
      }

      if (failedKeys.length > 0) {
        throw new Error(`Failed to clear some storage keys: ${failedKeys.join(', ')}`);
      }

      return true;
    } catch (error) {
      console.error('Storage operation failed:', error);
      onError?.(error as Error);
      toast.error('Error al limpiar el almacenamiento');
      return false;
    } finally {
      setIsClearing(false);
    }
  }, [storage, onError, storageObject]);

  return {
    clearStorageKeys,
    isClearing
  };
}
