
import { useEffect, useRef } from "react";

export const useTypeform = (enabled: boolean, disableMicrophone: boolean = true) => {
  const typeformScriptRef = useRef<HTMLScriptElement | null>(null);
  const typeformWidgetRef = useRef<any>(null);

  useEffect(() => {
    if (!enabled) return;
    
    let scriptElement: HTMLScriptElement | null = null;

    // Function to create and load the Typeform script
    const loadTypeformScript = () => {
      const script = document.createElement('script');
      script.src = "//embed.typeform.com/next/embed.js";
      script.async = true;
      document.body.appendChild(script);
      typeformScriptRef.current = script;
      
      script.onload = () => {
        console.log("Typeform script loaded successfully");
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
                });
              }
            }
          }, 500);
        }
      };
      
      script.onerror = () => {
        console.error("Failed to load Typeform script");
      };

      return script;
    };

    // Only create the script if it doesn't exist yet
    if (!typeformScriptRef.current) {
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
