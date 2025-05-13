
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
   * Register a Typeform container for cleanup
   * @param formId The Typeform ID to register
   * @param containerId The HTML container ID for this form
   * @returns Cleanup function
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
   * Clean up Typeform resources for a specific form
   * @param formId The Typeform ID to clean up
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
    
    // Clean up Typeform DOM elements
    cleanTypeformDOMElements(formId);
    
    // Clean generic resources
    cleanGenericTypeformResources();
    
    // Reset global state
    resetTypeformGlobalState(formId);
    
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
    
    // Reset all global state
    resetAllTypeformGlobalState();
  };
  
  // Return the combined resource manager with all required properties
  return {
    // Include the base resource manager methods
    registerResource: baseManager.registerResource,
    cleanupResources: baseManager.cleanupResources,
    // Add Typeform-specific methods
    registerTypeformContainer,
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
