
import { useEffect, useRef } from "react";

interface TypeformOptions {
  disableMicrophone?: boolean;
  keyboardShortcuts?: boolean;
  lazy?: boolean; // Allow lazy loading to prevent immediate initialization
}

export const useTypeform = (enabled: boolean, options: TypeformOptions = {}) => {
  const typeformScriptRef = useRef<HTMLScriptElement | null>(null);
  const typeformInitializedRef = useRef<boolean>(false);
  const typeformWidgetRef = useRef<any>(null);
  
  // Default options with safe defaults
  const {
    disableMicrophone = true, // Disable microphone access by default
    keyboardShortcuts = true,
    lazy = false
  } = options;

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
      document.body.appendChild(script);
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
        
        // Find all typeform widgets and initialize them
        setTimeout(() => {
          if (window.tf && window.tf.createWidget) {
            // Close any existing widgets to prevent duplicates
            if (typeformWidgetRef.current && typeof typeformWidgetRef.current.cleanup === 'function') {
              try {
                typeformWidgetRef.current.cleanup();
              } catch (err) {
                console.warn("Error cleaning up previous Typeform widget:", err);
              }
            }
            
            // Create widget with options
            typeformWidgetRef.current = window.tf.createWidget({
              disableKeyboardShortcuts: !keyboardShortcuts,
              disableAutoFocus: false, // Allow auto-focus for better accessibility
              enableSandbox: true, // Use sandbox mode for added security
              disableMicrophone: disableMicrophone, // Use option to control microphone access
              disableTracking: true, // Disable tracking for privacy
            });
            
            typeformInitializedRef.current = true;
            console.log("Typeform widget initialized with options:", { 
              disableMicrophone, 
              keyboardShortcuts 
            });
          }
        }, 100);
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
  }, [enabled, disableMicrophone, keyboardShortcuts, lazy]);

  // Return functions to explicitly initialize or cleanup
  return {
    initialize: () => {
      if (window.tf && typeof window.tf.createWidget === 'function' && !typeformInitializedRef.current) {
        if (typeformWidgetRef.current && typeof typeformWidgetRef.current.cleanup === 'function') {
          try {
            typeformWidgetRef.current.cleanup();
          } catch (err) {
            console.warn("Error cleaning up previous Typeform widget:", err);
          }
        }
        typeformWidgetRef.current = window.tf.createWidget({
          disableKeyboardShortcuts: !keyboardShortcuts,
          disableMicrophone: disableMicrophone,
          disableTracking: true,
          enableSandbox: true
        });
        typeformInitializedRef.current = true;
        console.log("Typeform widget manually initialized");
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
    isInitialized: typeformInitializedRef.current
  };
};
