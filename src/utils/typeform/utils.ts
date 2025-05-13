
/**
 * Common utility functions for Typeform integrations
 */

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
 * Check if the Typeform script is ready
 * @returns Boolean indicating if the Typeform API is ready to use
 */
export const isTypeformScriptReady = (): boolean => {
  return !!(window.tf && typeof window.tf.createWidget === 'function');
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
        // Get the current domain
        const domain = getSafeDomain();
        
        // Add domain property to window.tf - use direct assignment
        window.tf.domain = {
          currentDomain: domain,
          primaryDomain: domain
        };
        
        console.log("[Typeform] Domain set to:", domain);
        return true;
      }
      
      // Check if domain exists but has incomplete properties
      if (window.tf.domain) {
        const domain = window.tf.domain;
        let updated = false;
        
        if (!domain.currentDomain) {
          domain.currentDomain = getSafeDomain();
          updated = true;
        }
        
        if (!domain.primaryDomain) {
          domain.primaryDomain = getSafeDomain();
          updated = true;
        }
        
        if (updated) {
          console.log("[Typeform] Updated incomplete domain properties");
        }
        
        return updated;
      }
    }
    return false;
  } catch (err) {
    console.warn("[Typeform] Could not set Typeform domain fallback:", err);
    return false;
  }
};
