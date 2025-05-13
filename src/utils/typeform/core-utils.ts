
/**
 * Core utility functions for Typeform resource management
 */
import { getSafeDomain } from './utils';

/**
 * Fix Typeform domain for proper initialization
 * @returns Boolean indicating if domain was set successfully
 */
export const fixTypeformDomain = (): boolean => {
  try {
    if (!window.tf) {
      console.log("[TypeformResourceManager] window.tf not yet available");
      return false;
    }
    
    const hostname = window.location.hostname || "localhost";
    
    if (!window.tf.domain) {
      console.log("[TypeformResourceManager] Setting Typeform domain:", hostname);
      // Use type assertion since we've updated the type definition
      (window.tf as any).domain = {
        currentDomain: hostname,
        primaryDomain: hostname
      };
      return true;
    } else {
      // Domain exists but might need updating
      const domain = window.tf.domain;
      if (!domain.currentDomain || !domain.primaryDomain) {
        domain.currentDomain = hostname;
        domain.primaryDomain = hostname;
        console.log("[TypeformResourceManager] Updated incomplete Typeform domain:", hostname);
        return true;
      }
    }
    
    return true; // Domain was already set correctly
  } catch (err) {
    console.error("[TypeformResourceManager] Error fixing Typeform domain:", err);
    return false;
  }
};
