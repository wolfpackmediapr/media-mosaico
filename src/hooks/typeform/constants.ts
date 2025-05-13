
/**
 * Constants used for Typeform integration
 */

/** Maximum number of retry attempts when initializing Typeform */
export const MAX_RETRIES = 3;

/** Initial timeout before first initialization attempt (ms) */
export const INITIAL_TIMEOUT = 300;

/** URL for the Typeform embed script */
export const SCRIPT_SRC = "//embed.typeform.com/next/embed.js";

/** Global state tracking for script loading */
export let isGlobalScriptLoading = false;
export let isGlobalScriptLoaded = false;

/** Set global script loading state */
export const setGlobalScriptLoading = (isLoading: boolean) => {
  isGlobalScriptLoading = isLoading;
};

/** Set global script loaded state */
export const setGlobalScriptLoaded = (isLoaded: boolean) => {
  isGlobalScriptLoaded = isLoaded;
};
