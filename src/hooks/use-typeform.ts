
import { useEffect, useRef, useState } from "react";

interface TypeformOptions {
  disableMicrophone?: boolean;
  keyboardShortcuts?: boolean;
  lazy?: boolean; // Allow lazy loading to prevent immediate initialization
  sandboxMode?: boolean; // Add sandbox mode option
}

// Maximum number of retry attempts when initializing Typeform
const MAX_RETRIES = 3;
const INITIAL_TIMEOUT = 300; // Increased from 100ms to 300ms

export const useTypeform = (enabled: boolean, options: TypeformOptions = {}) => {
  const typeformScriptRef = useRef<HTMLScriptElement | null>(null);
  const typeformInitializedRef = useRef<boolean>(false);
  const typeformWidgetRef = useRef<any>(null);
  const [isScriptLoading, setIsScriptLoading] = useState<boolean>(false);
  const [retryAttempts, setRetryAttempts] = useState<number>(0);
  
  // Default options with safe defaults
  const {
    disableMicrophone = true, // Disable microphone access by default
    keyboardShortcuts = true,
    lazy = false,
    sandboxMode = true // Enable sandbox mode by default for security
  } = options;

  // Helper function to check if Typeform script is ready
  const isTypeformScriptReady = (): boolean => {
    return !!(window.tf && typeof window.tf.createWidget === 'function');
  };

  // Helper to get the current domain in a safe way
  const getSafeDomain = (): string => {
    try {
      return window.location.hostname || "localhost";
    } catch (err) {
      console.warn("Could not access window.location.hostname, using default");
      return "localhost";
    }
  };

  useEffect(() => {
    // Only proceed if explicitly enabled
    if (!enabled) return;
    
    // Create and load the script if it doesn't exist yet
    if (!typeformScriptRef.current && !isScriptLoading) {
      console.log("Initializing Typeform script");
      setIsScriptLoading(true);
      
      const script = document.createElement('script');
      script.src = "//embed.typeform.com/next/embed.js";
      script.async = true;
      script.defer = true; // Add defer to prevent blocking page rendering
      
      script.onload = () => {
        console.log("Typeform script loaded successfully");
        setIsScriptLoading(false);
        if (!lazy) {
          setTimeout(() => {
            initializeTypeform();
          }, INITIAL_TIMEOUT); // Increased timeout for script initialization
        }
      };
      
      script.onerror = () => {
        console.error("Failed to load Typeform script");
        setIsScriptLoading(false);
      };
      
      document.body.appendChild(script);
      typeformScriptRef.current = script;
    } else if (enabled && !typeformInitializedRef.current && !isScriptLoading) {
      // If script exists but typeform not initialized yet, initialize it
      setTimeout(() => {
        initializeTypeform();
      }, INITIAL_TIMEOUT);
    }

    // Define a global fallback for Typeform's domain object
    // This addresses the "Cannot read properties of undefined (reading 'domain')" error
    function ensureTypeformEnvironment() {
      try {
        if (window.tf && !window.tf.domain) {
          console.log("Adding domain fallback for Typeform");
          // @ts-ignore - Adding custom property
          window.tf.domain = {
            currentDomain: getSafeDomain(),
            primaryDomain: getSafeDomain()
          };
        }
      } catch (err) {
        console.warn("Could not set Typeform domain fallback:", err);
      }
    }

    function initializeTypeform() {
      // Set up environment fallbacks first
      ensureTypeformEnvironment();
      
      // Check if the typeform API is available
      if (isTypeformScriptReady()) {
        console.log("Creating Typeform widget");
        
        try {
          // Wait a moment for DOM to be fully ready
          setTimeout(() => {
            // Check again right before creating widget
            if (isTypeformScriptReady()) {
              // Close any existing widgets to prevent duplicates
              if (typeformWidgetRef.current && typeof typeformWidgetRef.current.cleanup === 'function') {
                try {
                  typeformWidgetRef.current.cleanup();
                  typeformWidgetRef.current = null;
                } catch (err) {
                  console.warn("Error cleaning up previous Typeform widget:", err);
                }
              }
              
              // Additional safety check for tf.domain
              ensureTypeformEnvironment();
              
              // Create widget with options
              try {
                typeformWidgetRef.current = window.tf.createWidget();
                
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
                console.log("Typeform widget initialized successfully with options:", { 
                  disableMicrophone, 
                  keyboardShortcuts,
                  sandboxMode
                });
              } catch (err) {
                console.error("Error creating Typeform widget:", err);
                // Reset initialization state to allow retry
                typeformInitializedRef.current = false;
                
                // Retry initialization with backoff if under max attempts
                if (retryAttempts < MAX_RETRIES) {
                  const nextAttempt = retryAttempts + 1;
                  setRetryAttempts(nextAttempt);
                  
                  // Exponential backoff
                  const retryDelay = INITIAL_TIMEOUT * Math.pow(2, nextAttempt);
                  console.log(`Retrying Typeform initialization in ${retryDelay}ms (attempt ${nextAttempt}/${MAX_RETRIES})`);
                  
                  setTimeout(() => {
                    initializeTypeform();
                  }, retryDelay);
                }
              }
            } else {
              console.warn("Typeform API not ready yet, waiting...");
              // If script is loaded but API not ready, retry with backoff
              if (retryAttempts < MAX_RETRIES) {
                const nextAttempt = retryAttempts + 1;
                setRetryAttempts(nextAttempt);
                
                // Exponential backoff
                const retryDelay = INITIAL_TIMEOUT * Math.pow(2, nextAttempt);
                console.log(`Waiting for Typeform API to be ready, retry in ${retryDelay}ms (attempt ${nextAttempt}/${MAX_RETRIES})`);
                
                setTimeout(() => {
                  initializeTypeform();
                }, retryDelay);
              }
            }
          }, INITIAL_TIMEOUT);
        } catch (err) {
          console.error("Unexpected error during Typeform initialization:", err);
          typeformInitializedRef.current = false;
        }
      }
    }

    return () => {
      // We don't remove the script on cleanup because we want to reuse it
      // Just note that we've disabled the widget
      if (typeformInitializedRef.current) {
        console.log("Typeform widget disabled");
        
        // Clean up any widget instance
        if (typeformWidgetRef.current && typeof typeformWidgetRef.current.cleanup === 'function') {
          try {
            typeformWidgetRef.current.cleanup();
            typeformWidgetRef.current = null;
          } catch (err) {
            console.warn("Error cleaning up Typeform widget on unmount:", err);
          }
        }
        
        typeformInitializedRef.current = false;
      }
    };
  }, [enabled, disableMicrophone, keyboardShortcuts, lazy, retryAttempts, isScriptLoading, sandboxMode]);

  // Return functions to explicitly initialize or cleanup
  return {
    initialize: () => {
      // Reset retry count when manually initializing
      setRetryAttempts(0);
      
      // Ensure environment is set up
      try {
        if (window.tf && !window.tf.domain) {
          // @ts-ignore - Adding custom property
          window.tf.domain = {
            currentDomain: getSafeDomain(),
            primaryDomain: getSafeDomain()
          };
        }
      } catch (err) {
        console.warn("Could not set Typeform domain:", err);
      }
      
      if (!isTypeformScriptReady()) {
        console.warn("Typeform script not ready yet. Waiting for script to load before initializing.");
        
        // If the script isn't ready yet, wait a moment and check again
        setTimeout(() => {
          if (isTypeformScriptReady()) {
            safeInitialize();
          } else {
            console.error("Typeform script still not ready after waiting. Please try refreshing the page.");
          }
        }, INITIAL_TIMEOUT * 2);
      } else {
        safeInitialize();
      }
      
      function safeInitialize() {
        try {
          // Clean up any existing instance first
          if (typeformWidgetRef.current && typeof typeformWidgetRef.current.cleanup === 'function') {
            try {
              typeformWidgetRef.current.cleanup();
            } catch (err) {
              console.warn("Error cleaning up previous Typeform widget:", err);
            }
          }
          
          // Create widget first
          if (isTypeformScriptReady()) {
            typeformWidgetRef.current = window.tf.createWidget();
            
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
            console.log("Typeform widget manually initialized");
          } else {
            console.error("Cannot initialize Typeform widget: window.tf.createWidget is not available");
          }
        } catch (err) {
          console.error("Error during manual Typeform initialization:", err);
          typeformInitializedRef.current = false;
        }
      }
    },
    cleanup: () => {
      if (typeformWidgetRef.current && typeof typeformWidgetRef.current.cleanup === 'function') {
        try {
          typeformWidgetRef.current.cleanup();
          typeformWidgetRef.current = null;
          typeformInitializedRef.current = false;
          console.log("Typeform widget manually cleaned up");
        } catch (err) {
          console.warn("Error manually cleaning up Typeform widget:", err);
        }
      }
    },
    isInitialized: typeformInitializedRef.current,
    isLoading: isScriptLoading
  };
};
