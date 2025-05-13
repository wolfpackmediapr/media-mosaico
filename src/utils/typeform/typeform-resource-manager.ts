
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
    const typeformElements = document.querySelectorAll('[data-tf-live], [data-tf-widget], [id^="typeform-"], [class^="typeform-"]');
    typeformElements.forEach(element => {
      try {
        if (element && element.parentNode) {
          element.parentNode.removeChild(element);
        }
      } catch (err) {
        console.error(`[TypeformResourceManager] Error removing typeform element:`, err);
      }
    });
    
    // Find and remove Typeform iframes
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
    
    // Clear resources tracking
    resources.elements = [];
    resources.scripts = [];
  };
  
  /**
   * Clean up all Typeform resources
   */
  const cleanupAllTypeformResources = () => {
    typeformResources.forEach((_, formId) => {
      cleanupTypeformResources(formId);
    });
    typeformResources.clear();
  };
  
  return {
    ...baseManager,
    registerTypeformContainer,
    trackTypeformElement,
    trackTypeformScript,
    cleanupTypeformResources,
    cleanupAllTypeformResources
  };
};
