
import { useEffect, useRef } from "react";

export const useTypeform = (enabled: boolean, disableMicrophone: boolean = true) => {
  const typeformScriptRef = useRef<HTMLScriptElement | null>(null);
  const typeformWidgetRef = useRef<any>(null);
  // Track if the Typeform script has been loaded to prevent duplicate loading
  const hasLoadedRef = useRef<boolean>(false);

  useEffect(() => {
    if (!enabled) return;
    
    let scriptElement: HTMLScriptElement | null = null;
    
    // Delay Typeform initialization to give audio context priority
    const initializationDelay = 1000;

    // Function to create and load the Typeform script
    const loadTypeformScript = () => {
      // If already loaded, don't load again
      if (hasLoadedRef.current || typeformScriptRef.current) {
        console.log("Typeform script already loaded, not loading again");
        return null;
      }

      console.log("Initializing Typeform with delay:", initializationDelay);
      
      // Set a timeout to delay Typeform initialization
      setTimeout(() => {
        const script = document.createElement('script');
        script.src = "//embed.typeform.com/next/embed.js";
        script.async = true;
        
        // Set attributes to prevent audio interference
        script.setAttribute('data-no-audio', 'true');
        
        script.onload = () => {
          console.log("Typeform script loaded successfully");
          hasLoadedRef.current = true;
          
          if (window.tf && typeof window.tf.createWidget === 'function') {
            setTimeout(() => {
              if (window.tf && window.tf.createWidget) {
                // Store reference to the widget for cleanup
                typeformWidgetRef.current = window.tf.createWidget();
                
                // Configure all Typeform embeds to disable microphone if needed
                if (disableMicrophone) {
                  // Safely set microphone configuration
                  if (!window.tf.microphone) {
                    window.tf.microphone = { enabled: false };
                  } else {
                    window.tf.microphone.enabled = false;
                  }
                }
                
                // Add microphone disabled attribute to all typeform embeds
                if (disableMicrophone) {
                  const typeformElements = document.querySelectorAll('[data-tf-live]');
                  typeformElements.forEach(element => {
                    element.setAttribute('data-tf-disable-microphone', 'true');
                    // Also add attribute to completely disable audio features
                    element.setAttribute('data-tf-disable-audio', 'true');
                  });
                }
              }
            }, 500);
          }
        };
        
        script.onerror = () => {
          console.error("Failed to load Typeform script");
        };

        document.body.appendChild(script);
        typeformScriptRef.current = script;
        return script;
      }, initializationDelay);
      
      return null;
    };

    // Only create the script if it doesn't exist yet
    if (!typeformScriptRef.current && !hasLoadedRef.current) {
      scriptElement = loadTypeformScript();
    }

    return () => {
      // Cleanup function - proper resource management
      if (typeformWidgetRef.current) {
        // Attempt to properly remove the widget if possible
        try {
          if (typeof typeformWidgetRef.current.unmount === 'function') {
            typeformWidgetRef.current.unmount();
          }
          typeformWidgetRef.current = null;
        } catch (err) {
          console.error("Error cleaning up Typeform widget:", err);
        }
      }
      
      // We don't want to remove the script during normal component lifecycle
      // as it could be reused by other components, but we'll set up for potential cleanup
    };
  }, [enabled, disableMicrophone]);

  return {};
};
