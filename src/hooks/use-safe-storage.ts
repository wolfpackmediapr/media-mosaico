
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

  const clearStorageKeys = useCallback(async (keys: string[]): Promise<boolean> => {
    if (!keys || keys.length === 0) {
      return true; // Nothing to clear, so technically successful
    }
    
    setIsClearing(true);
    const failedKeys: string[] = [];

    try {
      // Check if storage is available
      if (!storageObject) {
        throw new Error(`Storage type ${storage} is not available`);
      }

      // Log keys we're trying to clear
      console.log(`[useSafeStorage] Attempting to clear ${keys.length} keys: ${keys.join(', ')}`);
      
      // Try clearing all keys first
      for (const key of keys) {
        if (!key) continue; // Skip empty keys
        
        try {
          storageObject.removeItem(key);
          console.log(`[useSafeStorage] Successfully cleared key: ${key}`);
        } catch (error) {
          console.warn(`[useSafeStorage] Failed to clear key ${key} on first attempt:`, error);
          failedKeys.push(key);
        }
      }

      // Retry failed keys once with a delay
      if (failedKeys.length > 0) {
        console.log(`[useSafeStorage] Retrying ${failedKeys.length} failed keys`);
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const secondAttemptFailed: string[] = [];
        
        for (const key of failedKeys) {
          try {
            storageObject.removeItem(key);
            console.log(`[useSafeStorage] Retry success for key: ${key}`);
          } catch (error) {
            console.error(`[useSafeStorage] Retry failed for key ${key}:`, error);
            secondAttemptFailed.push(key);
          }
        }
        
        // Update failed keys to only contain those that failed both attempts
        failedKeys.splice(0, failedKeys.length, ...secondAttemptFailed);
      }

      const allSuccess = failedKeys.length === 0;
      
      if (!allSuccess) {
        console.warn(`[useSafeStorage] Failed to clear ${failedKeys.length} keys: ${failedKeys.join(', ')}`);
      } else {
        console.log('[useSafeStorage] Successfully cleared all keys');
      }

      return allSuccess;
    } catch (error) {
      console.error('[useSafeStorage] Storage operation failed:', error);
      onError?.(error as Error);
      return false;
    } finally {
      setIsClearing(false);
    }
  }, [storage, onError, storageObject]);

  // Verify if a key exists in storage
  const hasKey = useCallback((key: string): boolean => {
    try {
      return storageObject.getItem(key) !== null;
    } catch (error) {
      console.error(`[useSafeStorage] Error checking key ${key}:`, error);
      return false;
    }
  }, [storageObject]);

  // Get remaining keys that match a prefix
  const getRemainingKeys = useCallback((prefix: string): string[] => {
    try {
      const remaining: string[] = [];
      for (let i = 0; i < storageObject.length; i++) {
        const key = storageObject.key(i);
        if (key && key.startsWith(prefix)) {
          remaining.push(key);
        }
      }
      return remaining;
    } catch (error) {
      console.error(`[useSafeStorage] Error getting remaining keys with prefix ${prefix}:`, error);
      return [];
    }
  }, [storageObject]);

  return {
    clearStorageKeys,
    isClearing,
    hasKey,
    getRemainingKeys
  };
}
