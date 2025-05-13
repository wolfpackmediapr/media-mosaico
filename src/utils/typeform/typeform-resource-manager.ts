
/**
 * Specialized resource manager for Typeform components
 * Handles proper cleanup and reset of Typeform resources
 */
import { useResourceManager } from '../audio/resource-manager';
import { TypeformResources, TypeformResourceManager } from './types';
import { cleanTypeformDOMElements, cleanGenericTypeformResources } from './resource-cleanup';
import { resetTypeformGlobalState, resetAllTypeformGlobalState } from './global-state';
import { fixTypeformDomain } from './core-utils';

/**
 * Hook for managing Typeform-specific resources
 * Extends the base resource manager with Typeform-specific functionality
 */
export const useTypeformResourceManager = (): TypeformResourceManager => {
  // Use the base resource manager for general cleanup
  const baseManager = useResourceManager();
  
  // Track Typeform-specific resources
  const typeformResources = new Map<string, TypeformResources>();
  
  /**
   * Register a resource for later cleanup
   * @param resource The resource to register
   * @param cleanupFunc Optional cleanup function
   * @returns Cleanup function
   */
  const registerResource = (resource: any, cleanupFunc?: () => void) => {
    // Create a simple tracking mechanism
    const dispose = () => {
      if (cleanupFunc) {
        try {
          cleanupFunc();
        } catch (err) {
          console.error(`[TypeformResourceManager] Error in cleanup function:`, err);
        }
      }
    };
    
    return dispose;
  };

  /**
   * Clean up all registered resources
   */
  const cleanupResources = () => {
    // Use baseManager's cleanup as fallback
    if (baseManager.cleanup) {
      try {
        baseManager.cleanup();
      } catch (err) {
        console.error(`[TypeformResourceManager] Error in baseManager cleanup:`, err);
      }
    }
  };
  
  /**
   * Register a Typeform container for cleanup
   * @param formId The Typeform ID to register
   * @param containerId The HTML container ID for this form
   * @returns Cleanup function
   */
  const registerContainer = (formId: string, containerId: string) => {
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
   * Unregister a Typeform container
   * @param formId The Typeform ID to unregister
   */
  const unregisterContainer = (formId: string) => {
    console.log(`[TypeformResourceManager] Unregistering container for form ${formId}`);
    cleanupTypeformResources(formId);
    typeformResources.delete(formId);
  };
  
  /**
   * Track a Typeform-related DOM element for cleanup
   * @param formId The Typeform ID to associate the element with
   * @param element The HTML element to track
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
   * @param formId The Typeform ID to associate the script with
   * @param script The script element to track
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
   * Safely remove an element from the DOM if it's valid
   * @param element The element to remove
   * @param errorPrefix Prefix for error messages
   */
  const safelyRemoveElement = (element: HTMLElement, errorPrefix: string = 'Element') => {
    try {
      // Check if the element exists and has a valid parent before removal
      if (element && element.parentNode && document.body.contains(element.parentNode)) {
        element.parentNode.removeChild(element);
      }
    } catch (err) {
      console.error(`[TypeformResourceManager] Error removing ${errorPrefix}:`, err);
    }
  };
  
  /**
   * Clean up Typeform resources for a specific form
   * @param formId The Typeform ID to clean up
   */
  const cleanupTypeformResources = (formId: string) => {
    console.log(`[TypeformResourceManager] Cleaning up resources for form ${formId}`);
    
    const resources = typeformResources.get(formId);
    if (!resources) return;
    
    // Remove all tracked elements with safer checks
    resources.elements.forEach((element, index) => {
      try {
        safelyRemoveElement(element, `element ${index}`);
      } catch (err) {
        console.error(`[TypeformResourceManager] Error removing element ${index}:`, err);
      }
    });
    
    // Remove all tracked scripts with safer checks
    resources.scripts.forEach((script, index) => {
      try {
        safelyRemoveElement(script, `script ${index}`);
      } catch (err) {
        console.error(`[TypeformResourceManager] Error removing script ${index}:`, err);
      }
    });
    
    // Clean up Typeform DOM elements with improved error handling
    cleanTypeformDOMElements(formId);
    
    // Clean generic resources
    cleanGenericTypeformResources();
    
    // Reset global state
    try {
      resetTypeformGlobalState(formId);
    } catch (err) {
      console.error(`[TypeformResourceManager] Error resetting global state:`, err);
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
    
    // First clean up each form's specific resources
    typeformResources.forEach((_, formId) => {
      try {
        cleanupTypeformResources(formId);
      } catch (err) {
        console.error(`[TypeformResourceManager] Error cleaning up form ${formId}:`, err);
      }
    });
    typeformResources.clear();

    // Additionally, remove any generic Typeform elements that might have been missed
    try {
      const typeformElements = document.querySelectorAll('[data-tf-live], [data-tf-widget], [id^="typeform-"], [class^="typeform-"]');
      typeformElements.forEach((element, index) => {
        try {
          if (element && element.parentNode && document.body.contains(element.parentNode)) {
            element.parentNode.removeChild(element);
          }
        } catch (err) {
          console.error(`[TypeformResourceManager] Error removing generic element ${index}:`, err);
        }
      });
    } catch (err) {
      console.error(`[TypeformResourceManager] Error cleaning up generic elements:`, err);
    }

    // Clean up global iframes with safer checks
    try {
      const iframes = document.querySelectorAll('iframe[src*="typeform"]');
      iframes.forEach((iframe, index) => {
        try {
          if (iframe && iframe.parentNode && document.body.contains(iframe.parentNode)) {
            iframe.parentNode.removeChild(iframe);
          }
        } catch (err) {
          console.error(`[TypeformResourceManager] Error removing iframe ${index}:`, err);
        }
      });
    } catch (err) {
      console.error(`[TypeformResourceManager] Error cleaning up iframes:`, err);
    }
    
    // Reset all global state with error handling
    try {
      resetAllTypeformGlobalState();
    } catch (err) {
      console.error(`[TypeformResourceManager] Error resetting global state:`, err);
    }
  };
  
  // Return the combined resource manager with our own implementations and Typeform-specific methods
  return {
    // Implement the interface methods using our own functions or baseManager where appropriate
    registerResource,
    cleanupResources,
    // Add Typeform-specific methods
    registerContainer,
    unregisterContainer,
    trackTypeformElement,
    trackTypeformScript,
    cleanupTypeformResources,
    cleanupAllTypeformResources,
    fixTypeformDomain
  };
};

// Re-export utility functions for direct use
export {
  cleanTypeformDOMElements,
  cleanGenericTypeformResources
} from './resource-cleanup';

export {
  resetTypeformGlobalState,
  resetAllTypeformGlobalState
} from './global-state';

export {
  fixTypeformDomain
} from './core-utils';

// Export TypeformResources type for consumption by other modules
export type { TypeformResources } from './types';
