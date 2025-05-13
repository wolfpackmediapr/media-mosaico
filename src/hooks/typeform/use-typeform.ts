
/**
 * Main hook for Typeform integration
 * Provides a complete interface for initializing and managing Typeform widgets
 */
import { useEffect, useCallback, useRef, useState } from "react";
import { TypeformOptions, TypeformHookReturn } from "./types";
import { useTypeformScript } from "./use-typeform-script";
import { useTypeformWidget, TypeformWidgetConfig } from "./use-typeform-widget";
import { INITIAL_TIMEOUT } from "./constants";

/**
 * Main hook for Typeform integration
 * @param enabled Whether the Typeform widget should be enabled
 * @param options Configuration options for the Typeform widget
 * @returns Methods and state for controlling the Typeform widget
 */
export const useTypeform = (enabled: boolean, options: TypeformOptions = {}): TypeformHookReturn => {
  // Load the Typeform script
  const { isScriptLoading, isScriptLoaded, loadScript } = useTypeformScript();
  
  // Track initialization state
  const typeformInitializedRef = useRef<boolean>(false);
  const [lastError, setLastError] = useState<Error | null>(null);
  const [retryAttempts, setRetryAttempts] = useState<number>(0);
  
  const { lazy = false } = options;
  
  // Convert options to widget config
  const widgetConfig: TypeformWidgetConfig = {
    formId: options.formId || '',
    container: options.container || '',
    // Add other options as needed
  };

  // Initialize the widget with options
  const { 
    initializeWidget,
    cleanupWidget,
    isInitialized,
    error
  } = useTypeformWidget(widgetConfig);
  
  // Update error state
  useEffect(() => {
    if (error) {
      setLastError(new Error(error));
    }
  }, [error]);

  // Load and initialize on mount if enabled
  useEffect(() => {
    // Only proceed if explicitly enabled
    if (!enabled) return;
    
    // Load script if needed
    loadScript();
    
    // If script exists but typeform not initialized yet, initialize it
    if (isScriptLoaded && !isInitialized && !isScriptLoading && !lazy) {
      setTimeout(() => {
        initializeWidget();
        typeformInitializedRef.current = true;
      }, INITIAL_TIMEOUT);
    }

    return () => {
      // We don't remove the script on cleanup because we want to reuse it
      // Just note that we've disabled the widget
      if (isInitialized) {
        console.log("[useTypeform] Disabling Typeform widget on unmount");
        cleanupWidget();
        typeformInitializedRef.current = false;
      }
    };
  }, [enabled, isScriptLoaded, isScriptLoading, lazy, loadScript, initializeWidget, cleanupWidget, isInitialized]);

  /**
   * Explicitly initialize the Typeform widget
   * This is useful when lazy loading is enabled
   */
  const initialize = useCallback(() => {
    // Reset retry count when manually initializing
    setRetryAttempts(0);
    
    if (!isScriptLoaded) {
      console.warn("[useTypeform] Typeform script not ready yet. Waiting for script to load before initializing.");
      
      // If script isn't loaded yet, try to load it
      if (!isScriptLoaded && !isScriptLoading) {
        loadScript();
      }
      
      // Wait a moment and check again
      setTimeout(() => {
        initializeWidget();
        typeformInitializedRef.current = true;
      }, INITIAL_TIMEOUT * 2);
    } else {
      initializeWidget();
      typeformInitializedRef.current = true;
    }
  }, [isScriptLoaded, isScriptLoading, loadScript, initializeWidget]);

  // Return functions and state for controlling the Typeform widget
  return {
    initialize,
    cleanup: cleanupWidget,
    isInitialized: typeformInitializedRef.current,
    isLoading: isScriptLoading,
    error: lastError
  };
};

// Re-export all Typeform related functions
export * from "./types";
export * from "./use-typeform-script";
export * from "./use-typeform-widget";
