
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
    if (isClearing) return false; // Prevent concurrent clearing operations
    
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

      // Process keys in smaller batches to prevent UI freeze
      for (const key of keys) {
        try {
          storageObject.removeItem(key);
          // Short yield to let browser process other events
          await new Promise(resolve => setTimeout(resolve, 0));
        } catch (error) {
          console.error(`Error clearing key ${key}:`, error);
          failedKeys.push(key);
        }
      }

      // Retry failed keys once after a short delay
      if (failedKeys.length > 0) {
        await new Promise(resolve => setTimeout(resolve, 50));
        
        const stillFailedKeys: string[] = [];
        for (const key of failedKeys) {
          try {
            storageObject.removeItem(key);
          } catch (error) {
            console.error(`Retry failed for key ${key}:`, error);
            stillFailedKeys.push(key);
          }
        }
        
        // Update failed keys list after retries
        failedKeys.length = 0;
        failedKeys.push(...stillFailedKeys);
      }

      if (failedKeys.length > 0) {
        console.warn(`Could not clear ${failedKeys.length} storage keys: ${failedKeys.join(', ')}`);
      }

      return true;
    } catch (error) {
      console.error('Storage operation failed:', error);
      onError?.(error as Error);
      toast.error('Error al limpiar el almacenamiento');
      return false;
    } finally {
      // Small delay before releasing the clearing flag to prevent rapid reruns
      setTimeout(() => {
        setIsClearing(false);
      }, 50);
    }
  }, [storage, onError, storageObject, isClearing]);

  return {
    clearStorageKeys,
    isClearing
  };
}
