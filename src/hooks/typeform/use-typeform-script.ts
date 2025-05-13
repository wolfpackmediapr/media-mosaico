
/**
 * Hook for loading the Typeform script dynamically
 */
import { useState, useCallback, useEffect } from 'react';
import { ScriptLoaderReturn } from './types';
import { 
  TYPEFORM_SCRIPT_URL, 
  isGlobalScriptLoaded, 
  isGlobalScriptLoading, 
  setGlobalScriptLoaded, 
  setGlobalScriptLoading 
} from './constants';

// Function to check if script is already loaded
const isTypeformScriptLoaded = (): boolean => {
  return typeof window !== 'undefined' &&
    typeof window.tf !== 'undefined' &&
    typeof window.tf.createWidget === 'function';
};

/**
 * Load the Typeform script programmatically
 * Returns a promise that resolves when the script is loaded
 */
export const loadTypeformScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Skip if script is already loaded
    if (isTypeformScriptLoaded()) {
      console.log('[Typeform] Script already loaded');
      return resolve();
    }

    try {
      const existingScript = document.querySelector(`script[src="${TYPEFORM_SCRIPT_URL}"]`);
      
      if (existingScript) {
        console.log('[Typeform] Script already exists in DOM, waiting for it to load');
        // Script exists but may not be loaded yet
        existingScript.addEventListener('load', () => {
          console.log('[Typeform] Existing script loaded');
          setGlobalScriptLoaded(true);
          resolve();
        });
        
        existingScript.addEventListener('error', (e) => {
          setGlobalScriptLoading(false);
          reject(new Error(`Typeform script load error: ${e}`));
        });
        
        return;
      }
      
      console.log('[Typeform] Creating new script element');
      setGlobalScriptLoading(true);
      
      const script = document.createElement('script');
      script.src = TYPEFORM_SCRIPT_URL;
      script.async = true;
      
      script.addEventListener('load', () => {
        console.log('[Typeform] Script loaded successfully');
        setGlobalScriptLoaded(true);
        setGlobalScriptLoading(false);
        resolve();
      });
      
      script.addEventListener('error', (e) => {
        setGlobalScriptLoading(false);
        reject(new Error(`Typeform script load error: ${e}`));
      });
      
      document.head.appendChild(script);
    } catch (err) {
      setGlobalScriptLoading(false);
      reject(new Error(`Error loading Typeform script: ${err}`));
    }
  });
};

/**
 * React hook for loading the Typeform script
 */
export const useTypeformScript = (): ScriptLoaderReturn => {
  const [isScriptLoaded, setIsScriptLoaded] = useState<boolean>(isGlobalScriptLoaded || isTypeformScriptLoaded());
  const [isScriptLoading, setIsScriptLoading] = useState<boolean>(isGlobalScriptLoading);

  const loadScript = useCallback(async () => {
    // Skip if already loaded or loading
    if (isScriptLoaded || isScriptLoading) return;

    try {
      setIsScriptLoading(true);
      await loadTypeformScript();
      setIsScriptLoaded(true);
    } catch (error) {
      console.error('[useTypeformScript] Error:', error);
    } finally {
      setIsScriptLoading(false);
    }
  }, [isScriptLoaded, isScriptLoading]);

  // Check for script on mount
  useEffect(() => {
    // Only set state if not already loaded
    if (!isScriptLoaded && isTypeformScriptLoaded()) {
      setIsScriptLoaded(true);
    }
  }, [isScriptLoaded]);

  return {
    isScriptLoading,
    isScriptLoaded,
    loadScript,
  };
};

// Export the hook as default
export default useTypeformScript;
