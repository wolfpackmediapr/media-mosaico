
/**
 * Core utility functions for Typeform resource management
 */
import { getSafeDomain } from './utils';

/**
 * Fix Typeform domain for proper initialization
 * This must be called before any widget creation
 * @param forceUpdate Force update of domain even if it exists
 * @returns Boolean indicating if domain was set successfully
 */
export const fixTypeformDomain = (forceUpdate = false): boolean => {
  try {
    if (!window.tf) {
      console.log("[TypeformResourceManager] window.tf not yet available");
      return false;
    }
    
    const hostname = window.location.hostname || "localhost";
    
    // If window.tf exists but domain doesn't, or we're forcing an update
    if (!window.tf.domain || forceUpdate) {
      console.log("[TypeformResourceManager] Setting Typeform domain:", hostname);
      
      // Set the domain property directly on window.tf
      window.tf.domain = {
        currentDomain: hostname,
        primaryDomain: hostname
      };
      
      console.log("[TypeformResourceManager] Domain set successfully:", window.tf.domain);
      return true;
    } else {
      // Domain exists but might need updating
      const domain = window.tf.domain;
      if (!domain.currentDomain || !domain.primaryDomain || forceUpdate) {
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

/**
 * Create a safety wrapper around widget creation
 * This ensures the domain is set before creating a widget
 * @returns Created widget or null if creation failed
 */
export const safeCreateWidget = (): any => {
  try {
    // First ensure domain is properly set
    fixTypeformDomain();
    
    // Double check that tf exists and has createWidget
    if (!window.tf || typeof window.tf.createWidget !== 'function') {
      console.error("[TypeformResourceManager] window.tf or createWidget not available");
      return null;
    }
    
    // Double check domain exists before proceeding
    if (!window.tf.domain) {
      console.warn("[TypeformResourceManager] Domain still not set, creating default domain");
      window.tf.domain = {
        currentDomain: getSafeDomain(),
        primaryDomain: getSafeDomain()
      };
    }
    
    // Now it's safe to create the widget
    const widget = window.tf.createWidget();
    
    return widget;
  } catch (err) {
    console.error("[TypeformResourceManager] Error creating widget safely:", err);
    return null;
  }
};
