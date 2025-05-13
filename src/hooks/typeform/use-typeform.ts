
/**
 * Main hook for Typeform integration
 * Provides a complete interface for initializing and managing Typeform widgets
 */
import { useEffect, useCallback } from "react";
import { TypeformOptions, TypeformHookReturn } from "./types";
import { useTypeformScriptLoader } from "./use-script-loader";
import { useTypeformWidget } from "./use-typeform-widget";
import { INITIAL_TIMEOUT } from "./constants";
import { isTypeformScriptReady } from "./utils";

/**
 * Main hook for Typeform integration
 * @param enabled Whether the Typeform widget should be enabled
 * @param options Configuration options for the Typeform widget
 * @returns Methods and state for controlling the Typeform widget
 */
export const useTypeform = (enabled: boolean, options: TypeformOptions = {}): TypeformHookReturn => {
  // Load the Typeform script
  const { isScriptLoading, isScriptLoaded, loadScript } = useTypeformScriptLoader();
  
  // Initialize the widget with options
  const { 
    initializeWidget, 
    cleanupWidget, 
    safeInitialize, 
    typeformInitializedRef, 
    lastError, 
    setRetryAttempts 
  } = useTypeformWidget(options);
  
  const { lazy = false } = options;

  // Load and initialize on mount if enabled
  useEffect(() => {
    // Only proceed if explicitly enabled
    if (!enabled) return;
    
    // Load script if needed
    loadScript();
    
    // If script exists but typeform not initialized yet, initialize it
    if (isScriptLoaded && !typeformInitializedRef.current && !isScriptLoading && !lazy) {
      setTimeout(() => {
        initializeWidget();
      }, INITIAL_TIMEOUT);
    }

    return () => {
      // We don't remove the script on cleanup because we want to reuse it
      // Just note that we've disabled the widget
      if (typeformInitializedRef.current) {
        console.log("[useTypeform] Disabling Typeform widget on unmount");
        cleanupWidget();
      }
    };
  }, [enabled, isScriptLoaded, isScriptLoading, lazy, loadScript, initializeWidget, cleanupWidget]);

  /**
   * Explicitly initialize the Typeform widget
   * This is useful when lazy loading is enabled
   */
  const initialize = useCallback(() => {
    // Reset retry count when manually initializing
    setRetryAttempts(0);
    
    if (!isTypeformScriptReady()) {
      console.warn("[useTypeform] Typeform script not ready yet. Waiting for script to load before initializing.");
      
      // If script isn't loaded yet, try to load it
      if (!isScriptLoaded && !isScriptLoading) {
        loadScript();
      }
      
      // Wait a moment and check again
      setTimeout(() => {
        if (isTypeformScriptReady()) {
          safeInitialize();
        } else {
          console.error("[useTypeform] Typeform script still not ready after waiting. Please try refreshing the page.");
        }
      }, INITIAL_TIMEOUT * 2);
    } else {
      safeInitialize();
    }
  }, [isScriptLoaded, isScriptLoading, loadScript, safeInitialize, setRetryAttempts]);

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
export * from "./utils";
export * from "./constants";
export * from "./use-script-loader";
export * from "./use-typeform-widget";
