
/**
 * Get a safe domain for Typeform initialization
 * Falls back to localhost if window is not available
 */
export const getSafeDomain = (): string => {
  try {
    const hostname = window.location.hostname || "localhost";
    return hostname;
  } catch (error) {
    console.warn("[TypeformResourceManager] Error getting domain, falling back to localhost");
    return "localhost";
  }
};

/**
 * Safely access window.tf, initializing the object if needed
 */
export const ensureTfObject = (): boolean => {
  try {
    if (typeof window === 'undefined') return false;
    
    // Initialize window.tf if it doesn't exist
    if (!window.tf) {
      window.tf = {} as any;
      console.log("[TypeformResourceManager] Created empty window.tf object");
    }
    
    return true;
  } catch (error) {
    console.error("[TypeformResourceManager] Error ensuring tf object:", error);
    return false;
  }
};

/**
 * Check if the Typeform script is ready
 */
export const isTypeformScriptReady = (): boolean => {
  return !!(window.tf && typeof window.tf.createWidget === 'function');
};

/**
 * Ensure Typeform environment is set up correctly
 */
export const ensureTypeformEnvironment = (): boolean => {
  try {
    ensureTfObject();
    
    if (!window.tf.domain) {
      window.tf.domain = {
        currentDomain: getSafeDomain(),
        primaryDomain: getSafeDomain()
      };
      return true;
    }
    return false;
  } catch (error) {
    console.error("[TypeformResourceManager] Error ensuring Typeform environment:", error);
    return false;
  }
};
