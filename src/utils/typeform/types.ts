
/**
 * TypeScript type definitions for Typeform resource management
 */
// Export TypeformResources interface
export interface TypeformResources {
  /**
   * The ID of the container element
   */
  containerId: string;
  
  /**
   * DOM elements to clean up
   */
  elements: HTMLElement[];
  
  /**
   * Script elements to clean up
   */
  scripts: HTMLScriptElement[];
}

// Use export type for re-exports to fix the isolatedModules issue
export type { TypeformOptions, TypeformHookReturn, ScriptLoaderReturn } from '@/hooks/typeform/types';

export interface TypeformResourceManager {
  /**
   * Register a resource for later cleanup
   */
  registerResource: (resource: any, cleanupFunc?: () => void) => () => void;
  
  /**
   * Clean up all registered resources
   */
  cleanupResources: () => void;
  
  /**
   * Register a Typeform container for cleanup
   */
  registerContainer: (formId: string, containerId: string) => () => void;
  
  /**
   * Unregister a Typeform container
   */
  unregisterContainer: (formId: string) => void;
  
  /**
   * Track a Typeform-related DOM element for cleanup
   */
  trackTypeformElement: (formId: string, element: HTMLElement) => void;
  
  /**
   * Track a Typeform-related script for cleanup
   */
  trackTypeformScript: (formId: string, script: HTMLScriptElement) => void;
  
  /**
   * Clean up Typeform resources for a specific form
   */
  cleanupTypeformResources: (formId: string) => void;
  
  /**
   * Clean up all Typeform resources
   */
  cleanupAllTypeformResources: () => void;
  
  /**
   * Fix Typeform domain for proper initialization
   */
  fixTypeformDomain: () => boolean;
}
