
/**
 * Hook for managing Typeform widget lifecycle
 */
import { useRef, useState, useCallback } from "react";
import { TypeformOptions } from "./types";
import { MAX_RETRIES, INITIAL_TIMEOUT } from "./constants";
import { isTypeformScriptReady, ensureTypeformEnvironment } from "./utils";

/**
 * Hook for managing Typeform widget lifecycle
 */
export const useTypeformWidget = (options: TypeformOptions) => {
  const typeformInitializedRef = useRef<boolean>(false);
  const typeformWidgetRef = useRef<any>(null);
  const [retryAttempts, setRetryAttempts] = useState<number>(0);
  const [lastError, setLastError] = useState<Error | null>(null);

  // Extract options with defaults
  const {
    disableMicrophone = true,
    keyboardShortcuts = true,
    sandboxMode = true
  } = options;

  /**
   * Initialize the Typeform widget
   */
  const initializeWidget = useCallback(() => {
    // Set up environment fallbacks first
    ensureTypeformEnvironment();
    
    // Check if the typeform API is available
    if (!isTypeformScriptReady()) {
      console.warn("[useTypeformWidget] Typeform API not ready yet");
      
      // If script is loaded but API not ready, retry with backoff
      if (retryAttempts < MAX_RETRIES) {
        const nextAttempt = retryAttempts + 1;
        setRetryAttempts(nextAttempt);
        
        // Exponential backoff
        const retryDelay = INITIAL_TIMEOUT * Math.pow(2, nextAttempt);
        console.log(`[useTypeformWidget] Waiting for Typeform API to be ready, retry in ${retryDelay}ms (attempt ${nextAttempt}/${MAX_RETRIES})`);
        
        setTimeout(() => {
          initializeWidget();
        }, retryDelay);
      } else {
        setLastError(new Error("Typeform API not available after multiple attempts"));
      }
      return;
    }
    
    console.log("[useTypeformWidget] Creating Typeform widget");
    
    try {
      // Wait a moment for DOM to be fully ready
      setTimeout(() => {
        // Check again right before creating widget
        if (!isTypeformScriptReady()) {
          console.warn("[useTypeformWidget] Typeform API became unavailable");
          return;
        }
        
        // Close any existing widgets to prevent duplicates
        if (typeformWidgetRef.current && typeof typeformWidgetRef.current.cleanup === 'function') {
          try {
            typeformWidgetRef.current.cleanup();
            typeformWidgetRef.current = null;
          } catch (err) {
            console.warn("[useTypeformWidget] Error cleaning up previous Typeform widget:", err);
          }
        }
        
        // Additional safety check for tf.domain
        ensureTypeformEnvironment();
        
        // Create widget with options
        try {
          if (!window.tf) {
            console.error("[useTypeformWidget] window.tf is undefined");
            setLastError(new Error("window.tf is undefined"));
            return;
          }
          
          typeformWidgetRef.current = window.tf?.createWidget();
          
          // Configure widget with options if needed
          if (typeformWidgetRef.current && typeformWidgetRef.current.options) {
            typeformWidgetRef.current.options({
              disableKeyboardShortcuts: !keyboardShortcuts,
              disableAutoFocus: false, // Allow auto-focus for better accessibility
              enableSandbox: sandboxMode, // Use sandboxMode option
              disableMicrophone: disableMicrophone, // Use option to control microphone access
              disableTracking: true, // Disable tracking for privacy
            });
          }
          
          typeformInitializedRef.current = true;
          console.log("[useTypeformWidget] Typeform widget initialized successfully with options:", { 
            disableMicrophone, 
            keyboardShortcuts,
            sandboxMode
          });
        } catch (err) {
          console.error("[useTypeformWidget] Error creating Typeform widget:", err);
          setLastError(err instanceof Error ? err : new Error("Error creating Typeform widget"));
          
          // Reset initialization state to allow retry
          typeformInitializedRef.current = false;
          
          // Retry initialization with backoff if under max attempts
          if (retryAttempts < MAX_RETRIES) {
            const nextAttempt = retryAttempts + 1;
            setRetryAttempts(nextAttempt);
            
            // Exponential backoff
            const retryDelay = INITIAL_TIMEOUT * Math.pow(2, nextAttempt);
            console.log(`[useTypeformWidget] Retrying Typeform initialization in ${retryDelay}ms (attempt ${nextAttempt}/${MAX_RETRIES})`);
            
            setTimeout(() => {
              initializeWidget();
            }, retryDelay);
          }
        }
      }, INITIAL_TIMEOUT);
    } catch (err) {
      console.error("[useTypeformWidget] Unexpected error during Typeform initialization:", err);
      setLastError(err instanceof Error ? err : new Error("Unexpected error during Typeform initialization"));
      typeformInitializedRef.current = false;
    }
  }, [disableMicrophone, keyboardShortcuts, retryAttempts, sandboxMode]);

  /**
   * Cleanup the Typeform widget
   */
  const cleanupWidget = useCallback(() => {
    if (typeformInitializedRef.current && typeformWidgetRef.current) {
      console.log("[useTypeformWidget] Cleaning up Typeform widget");
      
      // Clean up any widget instance
      if (typeof typeformWidgetRef.current.cleanup === 'function') {
        try {
          typeformWidgetRef.current.cleanup();
          typeformWidgetRef.current = null;
          typeformInitializedRef.current = false;
        } catch (err) {
          console.warn("[useTypeformWidget] Error cleaning up Typeform widget:", err);
        }
      }
    }
  }, []);

  /**
   * Manual initialize with retry attempts reset
   */
  const safeInitialize = useCallback(() => {
    // Reset retry count when manually initializing
    setRetryAttempts(0);
    
    // Ensure environment is set up
    ensureTypeformEnvironment();
    
    try {
      // Clean up any existing instance first
      cleanupWidget();
      
      // Create widget first
      if (isTypeformScriptReady()) {
        typeformWidgetRef.current = window.tf?.createWidget();
        
        // Then configure it with options
        if (typeformWidgetRef.current && typeformWidgetRef.current.options) {
          typeformWidgetRef.current.options({
            disableKeyboardShortcuts: !keyboardShortcuts,
            disableMicrophone: disableMicrophone,
            disableTracking: true,
            enableSandbox: sandboxMode
          });
        }
        
        typeformInitializedRef.current = true;
        console.log("[useTypeformWidget] Typeform widget manually initialized");
        
        // Re-check environment again after initialization
        ensureTypeformEnvironment();
      } else {
        console.error("[useTypeformWidget] Cannot initialize Typeform widget: window.tf.createWidget is not available");
      }
    } catch (err) {
      console.error("[useTypeformWidget] Error during manual Typeform initialization:", err);
      setLastError(err instanceof Error ? err : new Error("Error during manual initialization"));
      typeformInitializedRef.current = false;
    }
  }, [cleanupWidget, disableMicrophone, keyboardShortcuts, sandboxMode]);

  return {
    initializeWidget,
    cleanupWidget,
    safeInitialize,
    typeformInitializedRef,
    lastError,
    setRetryAttempts
  };
};
