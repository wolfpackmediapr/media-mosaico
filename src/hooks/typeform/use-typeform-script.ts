
/**
 * Hook for loading the Typeform script
 */
import { useState, useCallback } from 'react';
import { SCRIPT_SRC, isGlobalScriptLoading, isGlobalScriptLoaded, setGlobalScriptLoading, setGlobalScriptLoaded } from './constants';

/**
 * Load the Typeform script
 * @returns Promise that resolves when script is loaded
 */
export const loadTypeformScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (isGlobalScriptLoaded) {
      console.log('[Typeform] Script already loaded');
      resolve();
      return;
    }

    if (isGlobalScriptLoading) {
      console.log('[Typeform] Script is already loading');
      
      // Check every 100ms if script has loaded
      const checkInterval = setInterval(() => {
        if (isGlobalScriptLoaded) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
      
      // Set timeout to prevent infinite waiting
      setTimeout(() => {
        clearInterval(checkInterval);
        if (!isGlobalScriptLoaded) {
          reject(new Error('Typeform script loading timeout'));
        }
      }, 10000);
      
      return;
    }
    
    // Start loading the script
    setGlobalScriptLoading(true);
    console.log('[Typeform] Loading script:', SCRIPT_SRC);
    
    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    
    script.onload = () => {
      setGlobalScriptLoaded(true);
      setGlobalScriptLoading(false);
      console.log('[Typeform] Script loaded successfully');
      resolve();
    };
    
    script.onerror = (error) => {
      setGlobalScriptLoading(false);
      console.error('[Typeform] Failed to load script:', error);
      reject(new Error('Failed to load Typeform script'));
    };
    
    document.body.appendChild(script);
  });
};

/**
 * Hook for loading and managing the Typeform script
 * @returns Script loading state and functions
 */
export const useTypeformScript = () => {
  const [isScriptLoading, setIsScriptLoading] = useState<boolean>(isGlobalScriptLoading);
  const [isScriptLoaded, setIsScriptLoaded] = useState<boolean>(isGlobalScriptLoaded);
  
  /**
   * Load the script if it doesn't exist yet
   */
  const loadScript = useCallback(() => {
    loadTypeformScript()
      .then(() => {
        setIsScriptLoaded(true);
        setIsScriptLoading(false);
      })
      .catch(() => {
        setIsScriptLoading(false);
      });
  }, []);
  
  return {
    isScriptLoading,
    isScriptLoaded,
    loadScript
  };
};
