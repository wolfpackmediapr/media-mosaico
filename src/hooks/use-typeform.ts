
import { useEffect, useRef, useState } from "react";

interface TypeformOptions {
  disableMicrophone?: boolean;
  keyboardShortcuts?: boolean;
  lazy?: boolean; // Allow lazy loading to prevent immediate initialization
}

export const useTypeform = (enabled: boolean, options: TypeformOptions = {}) => {
  const typeformScriptRef = useRef<HTMLScriptElement | null>(null);
  const typeformInitializedRef = useRef<boolean>(false);
  const typeformWidgetRef = useRef<any>(null);
  const cleanupInProgressRef = useRef<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  
  // Default options with safe defaults
  const {
    disableMicrophone = true, // Disable microphone access by default
    keyboardShortcuts = true,
    lazy = false
  } = options;

  // Helper function to safely perform DOM operations
  const safelyPerformDOMOperation = (operation: Function, operationName: string) => {
    try {
      operation();
      return true;
    } catch (err) {
      console.warn(`Error during Typeform ${operationName}:`, err);
      return false;
    }
  };

  useEffect(() => {
    // Only proceed if explicitly enabled
    if (!enabled) return;
    
    // Create and load the script if it doesn't exist yet
    if (!typeformScriptRef.current) {
      console.log("Initializing Typeform script");
      const script = document.createElement('script');
      script.src = "//embed.typeform.com/next/embed.js";
      script.async = true;
      script.defer = true; // Add defer to prevent blocking page rendering
      
      safelyPerformDOMOperation(() => {
        document.body.appendChild(script);
      }, "script append");
      
      typeformScriptRef.current = script;
      
      script.onload = () => {
        console.log("Typeform script loaded successfully");
        if (!lazy) {
          initializeTypeform();
        }
      };
      
      script.onerror = () => {
        console.error("Failed to load Typeform script");
      };
    } else if (enabled && !typeformInitializedRef.current) {
      // If script exists but typeform not initialized yet, initialize it
      initializeTypeform();
    }

    function initializeTypeform() {
      if (window.tf && typeof window.tf.createWidget === 'function') {
        console.log("Creating Typeform widget");
        
        // Find all typeform widgets and initialize them with a safe delay to ensure DOM stability
        setTimeout(() => {
          if (window.tf && window.tf.createWidget) {
            // Close any existing widgets to prevent duplicates - with safety checks
            if (typeformWidgetRef.current && typeof typeformWidgetRef.current.cleanup === 'function') {
              try {
                typeformWidgetRef.current.cleanup();
              } catch (err) {
                console.warn("Non-critical error cleaning up previous Typeform widget:", err);
                // Continue with initialization despite cleanup errors
              }
            }
            
            try {
              // Create widget with options
              typeformWidgetRef.current = window.tf.createWidget();
              
              // Configure widget with options if needed
              if (typeformWidgetRef.current && typeformWidgetRef.current.options) {
                typeformWidgetRef.current.options({
                  disableKeyboardShortcuts: !keyboardShortcuts,
                  disableAutoFocus: false, // Allow auto-focus for better accessibility
                  enableSandbox: true, // Use sandbox mode for added security
                  disableMicrophone: disableMicrophone, // Use option to control microphone access
                  disableTracking: true, // Disable tracking for privacy
                });
              }
              
              typeformInitializedRef.current = true;
              console.log("Typeform widget initialized with options:", { 
                disableMicrophone, 
                keyboardShortcuts 
              });
            } catch (err) {
              console.error("Error initializing Typeform widget:", err);
            }
          }
        }, 200); // Increased delay for better stability
      }
    }

    return () => {
      // We don't remove the script on cleanup because we want to reuse it
      // Just note that we've disabled the widget
      if (typeformInitializedRef.current) {
        console.log("Typeform widget disabled");
        
        // Clean up any widget instance safely
        safePerformCleanup();
        typeformInitializedRef.current = false;
      }
    };
  }, [enabled, disableMicrophone, keyboardShortcuts, lazy]);

  // Safe cleanup function with error handling
  const safePerformCleanup = () => {
    if (cleanupInProgressRef.current) {
      console.log("Cleanup already in progress, skipping duplicate cleanup request");
      return false;
    }

    cleanupInProgressRef.current = true;
    
    try {
      if (typeformWidgetRef.current && typeof typeformWidgetRef.current.cleanup === 'function') {
        typeformWidgetRef.current.cleanup();
        typeformWidgetRef.current = null;
        typeformInitializedRef.current = false;
        console.log("Typeform widget cleaned up successfully");
        return true;
      }
    } catch (err) {
      console.warn("Error cleaning up Typeform widget:", err);
    } finally {
      // Always reset the cleanup flag
      setTimeout(() => {
        cleanupInProgressRef.current = false;
      }, 300); // Add delay before allowing next cleanup
    }
    return false;
  };

  // Return functions to explicitly initialize or cleanup with improved error handling
  return {
    initialize: () => {
      if (isRefreshing) {
        console.log("Refresh operation in progress, skipping initialization request");
        return;
      }
      
      if (window.tf && typeof window.tf.createWidget === 'function' && !typeformInitializedRef.current) {
        try {
          if (typeformWidgetRef.current && typeof typeformWidgetRef.current.cleanup === 'function') {
            safePerformCleanup();
          }
          
          // Add delay to ensure DOM is stable before reinitializing
          setTimeout(() => {
            try {
              // Create widget first
              typeformWidgetRef.current = window.tf.createWidget();
              
              // Then configure it with options
              if (typeformWidgetRef.current && typeformWidgetRef.current.options) {
                typeformWidgetRef.current.options({
                  disableKeyboardShortcuts: !keyboardShortcuts,
                  disableMicrophone: disableMicrophone,
                  disableTracking: true,
                  enableSandbox: true
                });
              }
              
              typeformInitializedRef.current = true;
              console.log("Typeform widget manually initialized");
            } catch (err) {
              console.error("Error during manual Typeform initialization:", err);
            }
          }, 200);
        } catch (err) {
          console.error("Failed to initialize Typeform:", err);
        }
      }
    },
    cleanup: () => {
      return safePerformCleanup();
    },
    refresh: () => {
      if (isRefreshing) {
        console.log("Refresh already in progress, skipping duplicate refresh request");
        return Promise.resolve(false);
      }
      
      setIsRefreshing(true);
      console.log("Starting Typeform refresh...");
      
      // Return a promise to allow better control flow for the caller
      return new Promise<boolean>((resolve) => {
        // First safely cleanup the existing widget
        safePerformCleanup();
        
        // Wait for cleanup to complete and DOM to stabilize
        setTimeout(() => {
          try {
            if (window.tf && typeof window.tf.createWidget === 'function') {
              // Create widget
              typeformWidgetRef.current = window.tf.createWidget();
              
              // Configure widget
              if (typeformWidgetRef.current && typeformWidgetRef.current.options) {
                typeformWidgetRef.current.options({
                  disableKeyboardShortcuts: !keyboardShortcuts,
                  disableMicrophone: disableMicrophone,
                  disableTracking: true,
                  enableSandbox: true
                });
              }
              
              typeformInitializedRef.current = true;
              console.log("Typeform widget refreshed successfully");
              setIsRefreshing(false);
              resolve(true);
            } else {
              console.warn("Typeform API not available for refresh");
              setIsRefreshing(false);
              resolve(false);
            }
          } catch (err) {
            console.error("Error during Typeform refresh:", err);
            setIsRefreshing(false);
            resolve(false);
          }
        }, 400); // Longer delay for refresh to ensure stability
      });
    },
    isInitialized: typeformInitializedRef.current,
    isRefreshing
  };
};
