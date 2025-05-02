
import { useEffect, useRef } from "react";

export const useTypeform = (enabled: boolean) => {
  const typeformScriptRef = useRef<HTMLScriptElement | null>(null);
  const typeformInitializedRef = useRef<boolean>(false);

  useEffect(() => {
    // Only proceed if explicitly enabled
    if (!enabled) return;
    
    // Create and load the script if it doesn't exist yet
    if (!typeformScriptRef.current) {
      console.log("Initializing Typeform script");
      const script = document.createElement('script');
      script.src = "//embed.typeform.com/next/embed.js";
      script.async = true;
      document.body.appendChild(script);
      typeformScriptRef.current = script;
      
      script.onload = () => {
        console.log("Typeform script loaded successfully");
        initializeTypeform();
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
        setTimeout(() => {
          if (window.tf && window.tf.createWidget) {
            window.tf.createWidget();
            typeformInitializedRef.current = true;
          }
        }, 500);
      }
    }

    return () => {
      // We don't remove the script on cleanup because we want to reuse it
      // Just note that we've disabled the widget
      if (typeformInitializedRef.current) {
        console.log("Typeform widget disabled");
        typeformInitializedRef.current = false;
      }
    };
  }, [enabled]);

  return {};
};
