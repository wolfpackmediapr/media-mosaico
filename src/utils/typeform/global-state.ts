
/**
 * Utilities for managing Typeform's global state
 */

/**
 * Reset Typeform global state for a specific form
 * @param formId The Typeform ID to reset
 */
export const resetTypeformGlobalState = (formId: string): void => {
  try {
    if (window.tf && (window.tf as any)._instances) {
      // Reset any instances for this specific form
      if ((window.tf as any)._instances[formId]) {
        delete (window.tf as any)._instances[formId];
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
    if (window.tf && (window.tf as any)._instances) {
      (window.tf as any)._instances = {};
      console.log("[TypeformResourceManager] Reset all Typeform instances");
    }
  } catch (err) {
    console.error("[TypeformResourceManager] Error resetting all instances:", err);
  }
};
