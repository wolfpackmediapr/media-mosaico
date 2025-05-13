
/**
 * Type definitions for Typeform resource management
 */

export interface TypeformResources {
  containerId: string;
  elements: HTMLElement[];
  scripts: HTMLScriptElement[];
}

export interface TypeformResourceManager {
  registerTypeformContainer: (formId: string, containerId: string) => () => void;
  trackTypeformElement: (formId: string, element: HTMLElement) => void;
  trackTypeformScript: (formId: string, script: HTMLScriptElement) => void;
  cleanupTypeformResources: (formId: string) => void;
  cleanupAllTypeformResources: () => void;
  fixTypeformDomain: () => boolean;
}
