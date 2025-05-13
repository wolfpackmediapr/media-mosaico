import { useEffect, useRef, useState, useCallback } from "react";

interface TypeformOptions {
  disableMicrophone?: boolean;
  keyboardShortcuts?: boolean;
  lazy?: boolean; // Allow lazy loading to prevent immediate initialization
  sandboxMode?: boolean; // Add sandbox mode option
}

// Maximum number of retry attempts when initializing Typeform
const MAX_RETRIES = 3;
const INITIAL_TIMEOUT = 300; // Increased from 100ms to 300ms
const SCRIPT_SRC = "//embed.typeform.com/next/embed.js";

// Keep track of script loading globally to prevent duplicate script loads
let isGlobalScriptLoading = false;
let isGlobalScriptLoaded = false;

export const useTypeform = (enabled: boolean, options: TypeformOptions = {}) => {
  const typeformScriptRef = useRef<HTMLScriptElement | null>(null);
  const typeformInitializedRef = useRef<boolean>(false);
  const typeformWidgetRef = useRef<any>(null);
  const [isScriptLoading, setIsScriptLoading] = useState<boolean>(isGlobalScriptLoading);
  const [isScriptLoaded, setIsScriptLoaded] = useState<boolean>(isGlobalScriptLoaded);
  const [retryAttempts, setRetryAttempts] = useState<number>(0);
  const [lastError, setLastError] = useState<Error | null>(null);
  
  // Default options with safe defaults
  const {
    disableMicrophone = true, // Disable microphone access by default
    keyboardShortcuts = true,
    lazy = false,
    sandboxMode = true // Enable sandbox mode by default for security
  } = options;

  // Helper function to check if Typeform script is ready
  const isTypeformScriptReady = useCallback((): boolean => {
    return !!(window.tf && typeof window.tf.createWidget === 'function');
  }, []);

  // Helper to get the current domain in a safe way
  const getSafeDomain = useCallback((): string => {
    try {
      return window.location.hostname || "localhost";
    } catch (err) {
      console.warn("Could not access window.location.hostname, using default");
      return "localhost";
    }
  }, []);

  // Define a global fallback for Typeform's domain object
  const ensureTypeformEnvironment = useCallback(() => {
    try {
      if (window.tf) {
        // Check if domain exists on window.tf safely
        if (!window.tf.domain) {
          console.log("[useTypeform] Adding domain fallback for Typeform");
          // Add domain property to window.tf - use type assertion since we've updated the type definition
          (window.tf as any).domain = {
            currentDomain: getSafeDomain(),
            primaryDomain: getSafeDomain()
          };
          return true;
        }
      }
      return false;
    } catch (err) {
      console.warn("[useTypeform] Could not set Typeform domain fallback:", err);
      return false;
    }
  }, [getSafeDomain]);

  // Load the Typeform script if it doesn't exist yet
  const loadTypeformScript = useCallback(() => {
    if (typeformScriptRef.current || isGlobalScriptLoading || isGlobalScriptLoaded) {
      return;
    }
    
    console.log("[useTypeform] Loading Typeform script");
    isGlobalScriptLoading = true;
    setIsScriptLoading(true);
    
    const existingScript = document.querySelector(`script[src*="${SCRIPT_SRC}"]`) as HTMLScriptElement | null;
    
    if (existingScript) {
      console.log("[useTypeform] Found existing Typeform script");
      typeformScriptRef.current = existingScript;
      
      // Check if the script is already loaded
      if (isTypeformScriptReady()) {
        console.log("[useTypeform] Existing script is already loaded");
        isGlobalScriptLoaded = true;
        setIsScriptLoaded(true);
        setIsScriptLoading(false);
        isGlobalScriptLoading = false;
        
        // Initialize if needed
        if (!lazy && enabled) {
          setTimeout(() => {
            initializeTypeform();
          }, INITIAL_TIMEOUT);
        }
        return;
      }
      
      // If script exists but not loaded, add load handler
      existingScript.addEventListener("load", handleScriptLoad);
      existingScript.addEventListener("error", handleScriptError);
      return;
    }
    
    // Create new script if none exists
    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true; // Add defer to prevent blocking page rendering
    
    script.addEventListener("load", handleScriptLoad);
    script.addEventListener("error", handleScriptError);
    
    document.body.appendChild(script);
    typeformScriptRef.current = script;
    
    function handleScriptLoad() {
      console.log("[useTypeform] Typeform script loaded successfully");
      isGlobalScriptLoaded = true;
      setIsScriptLoaded(true);
      setIsScriptLoading(false);
      isGlobalScriptLoading = false;
      
      if (!lazy && enabled) {
        setTimeout(() => {
          initializeTypeform();
        }, INITIAL_TIMEOUT);
      }
    }
    
    function handleScriptError() {
      console.error("[useTypeform] Failed to load Typeform script");
      setLastError(new Error("Failed to load Typeform script"));
      setIsScriptLoading(false);
      isGlobalScriptLoading = false;
    }
  }, [enabled, isTypeformScriptReady, lazy]);

  // Initialize Typeform widget
  const initializeTypeform = useCallback(() => {
    // Only initialize if enabled
    if (!enabled) {
      console.log("[useTypeform] Initialization skipped - not enabled");
      return;
    }
    
    // Set up environment fallbacks first
    ensureTypeformEnvironment();
    
    // Check if the typeform API is available
    if (!isTypeformScriptReady()) {
      console.warn("[useTypeform] Typeform API not ready yet");
      
      // If script is loaded but API not ready, retry with backoff
      if (retryAttempts < MAX_RETRIES) {
        const nextAttempt = retryAttempts + 1;
        setRetryAttempts(nextAttempt);
        
        // Exponential backoff
        const retryDelay = INITIAL_TIMEOUT * Math.pow(2, nextAttempt);
        console.log(`[useTypeform] Waiting for Typeform API to be ready, retry in ${retryDelay}ms (attempt ${nextAttempt}/${MAX_RETRIES})`);
        
        setTimeout(() => {
          initializeTypeform();
        }, retryDelay);
      } else {
        setLastError(new Error("Typeform API not available after multiple attempts"));
      }
      return;
    }
    
    console.log("[useTypeform] Creating Typeform widget");
    
    try {
      // Wait a moment for DOM to be fully ready
      setTimeout(() => {
        // Check again right before creating widget
        if (!isTypeformScriptReady()) {
          console.warn("[useTypeform] Typeform API became unavailable");
          return;
        }
        
        // Close any existing widgets to prevent duplicates
        if (typeformWidgetRef.current && typeof typeformWidgetRef.current.cleanup === 'function') {
          try {
            typeformWidgetRef.current.cleanup();
            typeformWidgetRef.current = null;
          } catch (err) {
            console.warn("[useTypeform] Error cleaning up previous Typeform widget:", err);
          }
        }
        
        // Additional safety check for tf.domain
        ensureTypeformEnvironment();
        
        // Create widget with options
        try {
          if (!window.tf) {
            console.error("[useTypeform] window.tf is undefined");
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
          console.log("[useTypeform] Typeform widget initialized successfully with options:", { 
            disableMicrophone, 
            keyboardShortcuts,
            sandboxMode
          });
        } catch (err) {
          console.error("[useTypeform] Error creating Typeform widget:", err);
          setLastError(err instanceof Error ? err : new Error("Error creating Typeform widget"));
          
          // Reset initialization state to allow retry
          typeformInitializedRef.current = false;
          
          // Retry initialization with backoff if under max attempts
          if (retryAttempts < MAX_RETRIES) {
            const nextAttempt = retryAttempts + 1;
            setRetryAttempts(nextAttempt);
            
            // Exponential backoff
            const retryDelay = INITIAL_TIMEOUT * Math.pow(2, nextAttempt);
            console.log(`[useTypeform] Retrying Typeform initialization in ${retryDelay}ms (attempt ${nextAttempt}/${MAX_RETRIES})`);
            
            setTimeout(() => {
              initializeTypeform();
            }, retryDelay);
          }
        }
      }, INITIAL_TIMEOUT);
    } catch (err) {
      console.error("[useTypeform] Unexpected error during Typeform initialization:", err);
      setLastError(err instanceof Error ? err : new Error("Unexpected error during Typeform initialization"));
      typeformInitializedRef.current = false;
    }
  }, [disableMicrophone, enabled, ensureTypeformEnvironment, isTypeformScriptReady, keyboardShortcuts, retryAttempts, sandboxMode]);

  // Cleanup Typeform widget
  const cleanupTypeform = useCallback(() => {
    if (typeformInitializedRef.current && typeformWidgetRef.current) {
      console.log("[useTypeform] Cleaning up Typeform widget");
      
      // Clean up any widget instance
      if (typeof typeformWidgetRef.current.cleanup === 'function') {
        try {
          typeformWidgetRef.current.cleanup();
          typeformWidgetRef.current = null;
          typeformInitializedRef.current = false;
        } catch (err) {
          console.warn("[useTypeform] Error cleaning up Typeform widget:", err);
        }
      }
    }
  }, []);

  useEffect(() => {
    // Only proceed if explicitly enabled
    if (!enabled) return;
    
    // Load script if needed
    loadTypeformScript();
    
    // If script exists but typeform not initialized yet, initialize it
    if (isScriptLoaded && !typeformInitializedRef.current && !isScriptLoading && !lazy) {
      setTimeout(() => {
        initializeTypeform();
      }, INITIAL_TIMEOUT);
    }

    return () => {
      // We don't remove the script on cleanup because we want to reuse it
      // Just note that we've disabled the widget
      if (typeformInitializedRef.current) {
        console.log("[useTypeform] Disabling Typeform widget on unmount");
        cleanupTypeform();
      }
    };
  }, [enabled, isScriptLoaded, isScriptLoading, lazy, loadTypeformScript, initializeTypeform, cleanupTypeform]);

  // Return functions to explicitly initialize or cleanup
  return {
    initialize: () => {
      // Reset retry count when manually initializing
      setRetryAttempts(0);
      
      // Ensure environment is set up
      ensureTypeformEnvironment();
      
      if (!isTypeformScriptReady()) {
        console.warn("[useTypeform] Typeform script not ready yet. Waiting for script to load before initializing.");
        
        // If script isn't loaded yet, try to load it
        if (!isScriptLoaded && !isScriptLoading) {
          loadTypeformScript();
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
      
      function safeInitialize() {
        try {
          // Clean up any existing instance first
          cleanupTypeform();
          
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
            console.log("[useTypeform] Typeform widget manually initialized");
            
            // Re-check environment again after initialization
            ensureTypeformEnvironment();
          } else {
            console.error("[useTypeform] Cannot initialize Typeform widget: window.tf.createWidget is not available");
          }
        } catch (err) {
          console.error("[useTypeform] Error during manual Typeform initialization:", err);
          setLastError(err instanceof Error ? err : new Error("Error during manual initialization"));
          typeformInitializedRef.current = false;
        }
      }
    },
    cleanup: cleanupTypeform,
    isInitialized: typeformInitializedRef.current,
    isLoading: isScriptLoading,
    error: lastError
  };
};
