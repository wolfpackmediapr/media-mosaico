
import { useEffect, useRef } from "react";

export const useTypeform = (enabled: boolean) => {
  const typeformScriptRef = useRef<HTMLScriptElement | null>(null);

  useEffect(() => {
    if (!enabled) return;
    
    if (!typeformScriptRef.current) {
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
              window.tf.createWidget();
            }
          }, 500);
        }
      };
      
      script.onerror = () => {
        console.error("Failed to load Typeform script");
      };
    }

    return () => {
      // Cleanup function
      // We don't remove the script here to avoid reloading it if component remounts
    };
  }, [enabled]);

  return {};
};
