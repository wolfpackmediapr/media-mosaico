
// Export from the new location for backward compatibility
export { useResourceManager } from './audio/resource-manager';

// Export Typeform resource utilities for easy access
export { 
  useTypeformResourceManager,
  cleanTypeformDOMElements,
  cleanGenericTypeformResources,
  resetTypeformGlobalState,
  resetAllTypeformGlobalState,
  fixTypeformDomain
} from './typeform/typeform-resource-manager';

// Export additional Typeform utilities
export { 
  isTypeformScriptReady, 
  ensureTypeformEnvironment,
  getSafeDomain
} from './typeform/utils';
