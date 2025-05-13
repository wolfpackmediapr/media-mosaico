
/**
 * Hook for loading and managing the Typeform script
 */
import { useState, useRef, useCallback } from "react";
import { SCRIPT_SRC, isGlobalScriptLoading, isGlobalScriptLoaded, setGlobalScriptLoading, setGlobalScriptLoaded } from "./constants";
import { ScriptLoaderReturn } from "./types";
import { isTypeformScriptReady } from "./utils";

/**
 * Hook for loading the Typeform script
 * @returns Script loading state and functions
 */
export const useTypeformScriptLoader = (): ScriptLoaderReturn => {
  const typeformScriptRef = useRef<HTMLScriptElement | null>(null);
  const [isScriptLoading, setIsScriptLoading] = useState<boolean>(isGlobalScriptLoading);
  const [isScriptLoaded, setIsScriptLoaded] = useState<boolean>(isGlobalScriptLoaded);

  /**
   * Load the Typeform script if it doesn't exist yet
   */
  const loadScript = useCallback(() => {
    if (typeformScriptRef.current || isGlobalScriptLoading || isGlobalScriptLoaded) {
      return;
    }
    
    console.log("[useTypeformScriptLoader] Loading Typeform script");
    setGlobalScriptLoading(true);
    setIsScriptLoading(true);
    
    const existingScript = document.querySelector(`script[src*="${SCRIPT_SRC}"]`) as HTMLScriptElement | null;
    
    if (existingScript) {
      console.log("[useTypeformScriptLoader] Found existing Typeform script");
      typeformScriptRef.current = existingScript;
      
      // Check if the script is already loaded
      if (isTypeformScriptReady()) {
        console.log("[useTypeformScriptLoader] Existing script is already loaded");
        setGlobalScriptLoaded(true);
        setIsScriptLoaded(true);
        setIsScriptLoading(false);
        setGlobalScriptLoading(false);
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
      console.log("[useTypeformScriptLoader] Typeform script loaded successfully");
      setGlobalScriptLoaded(true);
      setIsScriptLoaded(true);
      setIsScriptLoading(false);
      setGlobalScriptLoading(false);
    }
    
    function handleScriptError() {
      console.error("[useTypeformScriptLoader] Failed to load Typeform script");
      setIsScriptLoading(false);
      setGlobalScriptLoading(false);
    }
  }, []);

  return {
    isScriptLoading,
    isScriptLoaded,
    loadScript
  };
};
