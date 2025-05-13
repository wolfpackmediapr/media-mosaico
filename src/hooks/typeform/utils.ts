
/**
 * Utility functions for Typeform integration
 */

/**
 * Check if the Typeform script is ready
 * @returns Boolean indicating if the Typeform API is ready to use
 */
export const isTypeformScriptReady = (): boolean => {
  return !!(window.tf && typeof window.tf.createWidget === 'function');
};

/**
 * Get the current domain in a safe way
 * @returns Current hostname or "localhost" as fallback
 */
export const getSafeDomain = (): string => {
  try {
    return window.location.hostname || "localhost";
  } catch (err) {
    console.warn("[Typeform] Could not access window.location.hostname, using default");
    return "localhost";
  }
};

/**
 * Define a global fallback for Typeform's domain object
 * @returns Boolean indicating if domain was set (true) or already existed (false)
 */
export const ensureTypeformEnvironment = (): boolean => {
  try {
    if (window.tf) {
      // Check if domain exists on window.tf safely
      if (!window.tf.domain) {
        console.log("[Typeform] Adding domain fallback for Typeform");
        // Add domain property to window.tf - use type assertion since we've updated the type definition
        (window.tf as any).domain = {
          currentDomain: getSafeDomain(),
          primaryDomain: getSafeDomain()
        };
        return true;
      }
    }
    return false;
  } catch (err) {
    console.warn("[Typeform] Could not set Typeform domain fallback:", err);
    return false;
  }
};
