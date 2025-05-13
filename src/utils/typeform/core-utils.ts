
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
    
    const hostname = getSafeDomain();
    
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
        console.log("[TypeformResourceManager] Domain updated:", domain);
      }
      return true;
    }
  } catch (error) {
    console.error("[TypeformResourceManager] Error setting domain:", error);
    return false;
  }
};

/**
 * Safely create a Typeform widget with domain validation
 * @param params Widget creation parameters
 * @returns Created widget or null if creation failed
 */
export const safeCreateWidget = (params: any): any => {
  try {
    // Ensure domain is set before creating widget
    fixTypeformDomain();
    
    // Double-check that domain exists, if not create it as a fallback
    if (!window.tf.domain) {
      console.warn("[TypeformResourceManager] Domain still not available, applying emergency fix");
      window.tf.domain = {
        currentDomain: getSafeDomain(),
        primaryDomain: getSafeDomain()
      };
    }
    
    // Now it's safe to create the widget
    console.log("[TypeformResourceManager] Creating widget with params:", 
      { formId: params.formId, container: params.container });
    
    return window.tf.createWidget(params);
  } catch (error) {
    console.error("[TypeformResourceManager] Error creating widget:", error);
    return null;
  }
};

/**
 * Ensure the Typeform library is properly initialized
 * Call this before any Typeform operations
 */
export const ensureTypeformInitialized = (): boolean => {
  try {
    // Check if the library is loaded
    if (typeof window.tf === 'undefined') {
      console.warn("[TypeformResourceManager] Typeform library not loaded");
      return false;
    }
    
    // Fix domain and ensure it's properly set
    const domainFixed = fixTypeformDomain();
    
    // Verify the critical methods exist
    const hasCreateWidget = typeof window.tf.createWidget === 'function';
    
    if (!hasCreateWidget) {
      console.warn("[TypeformResourceManager] Typeform createWidget method not available");
      return false;
    }
    
    return domainFixed && hasCreateWidget;
  } catch (error) {
    console.error("[TypeformResourceManager] Error during initialization check:", error);
    return false;
  }
};
