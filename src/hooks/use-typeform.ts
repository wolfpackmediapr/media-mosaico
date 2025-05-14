
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
  const refreshAttemptRef = useRef<number>(0);
  
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

  // Fixed refresh function with multiple retry attempts and iframe fallback
  const refresh = async () => {
    if (isRefreshing) {
      console.log("Refresh already in progress, skipping duplicate refresh request");
      return Promise.resolve(false);
    }
    
    setIsRefreshing(true);
    refreshAttemptRef.current += 1;
    console.log(`Starting Typeform refresh attempt ${refreshAttemptRef.current}...`);
    
    return new Promise<boolean>((resolve) => {
      // First try the standard method of cleanup and recreation
      const cleanupSuccess = safePerformCleanup();
      
      // Allow more time for cleanup to complete fully
      setTimeout(() => {
        try {
          if (window.tf && typeof window.tf.createWidget === 'function') {
            // Try recreating the widget
            try {
              typeformWidgetRef.current = window.tf.createWidget();
              
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
              
              // If normal refresh worked, reset attempts
              refreshAttemptRef.current = 0;
              
              // Allow time for the widget to fully initialize
              setTimeout(() => {
                setIsRefreshing(false);
                resolve(true);
              }, 500);
            } catch (err) {
              console.error("Error during primary Typeform refresh method:", err);
              
              // If primary method failed and we haven't tried too many times, try iframe refresh fallback
              if (refreshAttemptRef.current <= 2) {
                tryIframeRefresh();
              } else {
                console.error("Maximum refresh attempts reached, giving up");
                setIsRefreshing(false);
                resolve(false);
              }
            }
          } else {
            console.warn("Typeform API not available for refresh, trying iframe fallback");
            tryIframeRefresh();
          }
        } catch (err) {
          console.error("Unexpected error during Typeform refresh:", err);
          tryIframeRefresh();
        }
      }, 600); // Longer delay for cleanup to complete
      
      // Fallback refresh method - reload the iframe directly if we can find it
      function tryIframeRefresh() {
        try {
          const typeformIframes = document.querySelectorAll('iframe[src*="typeform.com"]');
          if (typeformIframes && typeformIframes.length > 0) {
            console.log(`Found ${typeformIframes.length} Typeform iframe(s), attempting direct refresh`);
            
            typeformIframes.forEach((iframe: HTMLIFrameElement) => {
              const currentSrc = iframe.src;
              // Force iframe refresh by temporarily clearing and resetting src
              iframe.src = '';
              
              setTimeout(() => {
                iframe.src = currentSrc;
                console.log("Typeform iframe refreshed directly");
                
                // Allow time for iframe to load
                setTimeout(() => {
                  setIsRefreshing(false);
                  resolve(true);
                }, 800);
              }, 100);
            });
          } else {
            console.warn("No Typeform iframes found for direct refresh");
            setIsRefreshing(false);
            resolve(false);
          }
        } catch (fallbackErr) {
          console.error("Error during fallback iframe refresh:", fallbackErr);
          setIsRefreshing(false);
          resolve(false);
        }
      }
    });
  };

  // Return functions to explicitly initialize, cleanup, refresh with improved error handling
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
    refresh, // Use the enhanced refresh function
    isInitialized: typeformInitializedRef.current,
    isRefreshing
  };
};
