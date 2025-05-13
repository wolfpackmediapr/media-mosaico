
/**
 * Re-export Typeform resource management utilities from their new locations
 * This file is kept for backward compatibility
 */
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
