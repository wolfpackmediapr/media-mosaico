
import { useState, useCallback } from 'react';
import { toast } from "sonner";

interface SafeStorageOptions {
  onError?: (error: Error) => void;
  storage?: 'localStorage' | 'sessionStorage';
  batchSize?: number;
  batchDelay?: number;
}

export function useSafeStorage(options: SafeStorageOptions = {}) {
  const { 
    storage = 'sessionStorage', 
    onError,
    batchSize = 2, // Reduced from 5 to 2
    batchDelay = 50 // Increased from 0/10ms to 50ms
  } = options;
  
  const [isClearing, setIsClearing] = useState(false);
  const [progress, setProgress] = useState(0);

  const storageObject = window[storage];

  const clearStorageKeys = useCallback(async (keys: string[]): Promise<void> => {
    if (isClearing) return; // Prevent concurrent clearing operations
    
    setIsClearing(true);
    setProgress(0);
    const failedKeys: string[] = [];
    const totalKeys = keys.length;

    try {
      // Check available space
      const testKey = '_storage_test_';
      try {
        storageObject.setItem(testKey, '1');
        storageObject.removeItem(testKey);
      } catch (e) {
        throw new Error('Storage is not available');
      }

      // Process keys in smaller batches with longer delays between batches
      for (let i = 0; i < keys.length; i += batchSize) {
        // Update progress
        setProgress(Math.round((i / totalKeys) * 100));
        
        const batch = keys.slice(i, i + batchSize);
        
        for (const key of batch) {
          try {
            storageObject.removeItem(key);
          } catch (error) {
            console.error(`Error clearing key ${key}:`, error);
            failedKeys.push(key);
          }
        }
        
        // Use longer yield to give browser more time to process UI events
        await new Promise(resolve => setTimeout(resolve, batchDelay));
      }

      // Retry failed keys once after a longer delay
      if (failedKeys.length > 0) {
        await new Promise(resolve => setTimeout(resolve, 150)); // Increased delay before retry
        
        const stillFailedKeys: string[] = [];
        for (const key of failedKeys) {
          try {
            storageObject.removeItem(key);
          } catch (error) {
            console.error(`Retry failed for key ${key}:`, error);
            stillFailedKeys.push(key);
          }
          
          // Small yield after each failed key retry
          await new Promise(microtask => setTimeout(microtask, 20));
        }
        
        // Update failed keys list after retries
        failedKeys.length = 0;
        failedKeys.push(...stillFailedKeys);
      }

      setProgress(100);
      
      if (failedKeys.length > 0) {
        console.warn(`Could not clear ${failedKeys.length} storage keys: ${failedKeys.join(', ')}`);
      }
    } catch (error) {
      console.error('Storage operation failed:', error);
      onError?.(error as Error);
      toast.error('Error al limpiar el almacenamiento');
    } finally {
      // Longer delay before releasing the clearing flag to ensure UI has time to update
      setTimeout(() => {
        setIsClearing(false);
        setProgress(0);
      }, 200);
    }
  }, [storage, onError, storageObject, isClearing, batchSize, batchDelay]);

  return {
    clearStorageKeys,
    isClearing,
    progress
  };
}
