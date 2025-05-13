
/**
 * Utility functions for Typeform resource management
 */

/**
 * Safely remove all typeform elements associated with a form ID
 * @param formId The Typeform ID to clean up
 */
export const cleanTypeformDOMElements = (formId: string): void => {
  try {
    // Find and remove all Typeform-related elements by query selector
    const typeformElements = document.querySelectorAll(`[data-tf-live="${formId}"], [data-tf-widget="${formId}"], [id^="typeform-${formId}"], [class^="typeform-"]`);
    typeformElements.forEach(element => {
      try {
        if (element && element.parentNode) {
          element.parentNode.removeChild(element);
        }
      } catch (err) {
        console.error(`[TypeformResourceManager] Error removing typeform element:`, err);
      }
    });
    
    // Find and remove SPECIFIC Typeform iframes for this formId
    const iframes = document.querySelectorAll(`iframe[src*="typeform"][src*="${formId}"]`);
    iframes.forEach(iframe => {
      try {
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
      } catch (err) {
        console.error(`[TypeformResourceManager] Error removing iframe:`, err);
      }
    });
  } catch (error) {
    console.error(`[TypeformResourceManager] Error in cleanTypeformDOMElements:`, error);
  }
};

/**
 * Clean up generic Typeform resources that aren't tied to a specific form
 */
export const cleanGenericTypeformResources = (): void => {
  try {
    // Find and clean up any popup overlays
    const overlays = document.querySelectorAll('.typeform-popup-overlay, .typeform-popup-wrapper, .typeform-popup-container');
    overlays.forEach(overlay => {
      try {
        if (overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
      } catch (err) {
        console.error(`[TypeformResourceManager] Error removing overlay:`, err);
      }
    });

    // Find and remove any global Typeform styles
    const styles = document.querySelectorAll('style[id^="typeform-"]');
    styles.forEach(style => {
      try {
        if (style.parentNode) {
          style.parentNode.removeChild(style);
        }
      } catch (err) {
        console.error(`[TypeformResourceManager] Error removing style:`, err);
      }
    });
  } catch (error) {
    console.error(`[TypeformResourceManager] Error in cleanGenericTypeformResources:`, error);
  }
};

/**
 * Reset Typeform global state for a specific form
 * @param formId The Typeform ID to reset
 */
export const resetTypeformGlobalState = (formId: string): void => {
  try {
    if (window.tf && window.tf._instances) {
      // Reset any instances for this specific form
      if (window.tf._instances[formId]) {
        delete window.tf._instances[formId];
        console.log(`[TypeformResourceManager] Cleared instance for form ${formId}`);
      }
    }
  } catch (err) {
    console.error(`[TypeformResourceManager] Error resetting Typeform state:`, err);
  }
};

/**
 * Reset all Typeform global state
 */
export const resetAllTypeformGlobalState = (): void => {
  try {
    if (window.tf && window.tf._instances) {
      window.tf._instances = {};
      console.log("[TypeformResourceManager] Reset all Typeform instances");
    }
  } catch (err) {
    console.error("[TypeformResourceManager] Error resetting all instances:", err);
  }
};

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
