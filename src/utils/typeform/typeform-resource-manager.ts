
/**
 * Specialized resource manager for Typeform components
 * Handles proper cleanup and reset of Typeform resources
 */
import { useResourceManager } from '../audio/resource-manager';

interface TypeformResources {
  containerId: string;
  elements: HTMLElement[];
  scripts: HTMLScriptElement[];
}

/**
 * Hook for managing Typeform-specific resources
 * Extends the base resource manager with Typeform-specific functionality
 */
export const useTypeformResourceManager = () => {
  // Use the base resource manager for general cleanup
  const baseManager = useResourceManager();
  
  // Track Typeform-specific resources
  const typeformResources = new Map<string, TypeformResources>();
  
  /**
   * Register a Typeform container for cleanup
   */
  const registerTypeformContainer = (formId: string, containerId: string) => {
    console.log(`[TypeformResourceManager] Registering container for form ${formId}: ${containerId}`);
    
    if (!typeformResources.has(formId)) {
      typeformResources.set(formId, {
        containerId,
        elements: [],
        scripts: []
      });
    } else {
      // Update the container ID if it already exists
      const resources = typeformResources.get(formId);
      if (resources) {
        resources.containerId = containerId;
      }
    }
    
    return () => {
      // Cleanup function that can be called manually
      cleanupTypeformResources(formId);
    };
  };
  
  /**
   * Track a Typeform-related DOM element for cleanup
   */
  const trackTypeformElement = (formId: string, element: HTMLElement) => {
    if (!element) return;
    
    let resources = typeformResources.get(formId);
    if (!resources) {
      resources = {
        containerId: '',
        elements: [],
        scripts: []
      };
      typeformResources.set(formId, resources);
    }
    
    resources.elements.push(element);
  };
  
  /**
   * Track a Typeform-related script for cleanup
   */
  const trackTypeformScript = (formId: string, script: HTMLScriptElement) => {
    if (!script) return;
    
    let resources = typeformResources.get(formId);
    if (!resources) {
      resources = {
        containerId: '',
        elements: [],
        scripts: []
      };
      typeformResources.set(formId, resources);
    }
    
    resources.scripts.push(script);
  };
  
  /**
   * Clean up Typeform resources for a specific form
   */
  const cleanupTypeformResources = (formId: string) => {
    console.log(`[TypeformResourceManager] Cleaning up resources for form ${formId}`);
    
    const resources = typeformResources.get(formId);
    if (!resources) return;
    
    // Remove all tracked elements
    resources.elements.forEach(element => {
      try {
        if (element && element.parentNode) {
          element.parentNode.removeChild(element);
        }
      } catch (err) {
        console.error(`[TypeformResourceManager] Error removing element:`, err);
      }
    });
    
    // Remove all tracked scripts
    resources.scripts.forEach(script => {
      try {
        if (script && script.parentNode) {
          script.parentNode.removeChild(script);
        }
      } catch (err) {
        console.error(`[TypeformResourceManager] Error removing script:`, err);
      }
    });
    
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
    
    // Reset any global Typeform state on the window object
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
    
    // Clear resources tracking
    resources.elements = [];
    resources.scripts = [];
  };
  
  /**
   * Clean up all Typeform resources
   */
  const cleanupAllTypeformResources = () => {
    console.log("[TypeformResourceManager] Cleaning up all resources");
    
    typeformResources.forEach((_, formId) => {
      cleanupTypeformResources(formId);
    });
    typeformResources.clear();

    // Additionally, remove any generic Typeform elements
    const typeformElements = document.querySelectorAll('[data-tf-live], [data-tf-widget], [id^="typeform-"], [class^="typeform-"]');
    typeformElements.forEach(element => {
      try {
        if (element && element.parentNode) {
          element.parentNode.removeChild(element);
        }
      } catch (err) {
        console.error(`[TypeformResourceManager] Error removing generic typeform element:`, err);
      }
    });

    // Clean up global iframes
    const iframes = document.querySelectorAll('iframe[src*="typeform"]');
    iframes.forEach(iframe => {
      try {
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
      } catch (err) {
        console.error(`[TypeformResourceManager] Error removing iframe:`, err);
      }
    });
    
    // Also try to reset the global _instances property if it exists
    try {
      if (window.tf && window.tf._instances) {
        window.tf._instances = {};
        console.log("[TypeformResourceManager] Reset all Typeform instances");
      }
    } catch (err) {
      console.error("[TypeformResourceManager] Error resetting all instances:", err);
    }
  };
  
  // Fix any Typeform domain issues - enhanced version with more robust checks
  const fixTypeformDomain = () => {
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
  
  return {
    ...baseManager,
    registerTypeformContainer,
    trackTypeformElement,
    trackTypeformScript,
    cleanupTypeformResources,
    cleanupAllTypeformResources,
    fixTypeformDomain
  };
};
