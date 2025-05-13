
/**
 * Constants for Typeform integration
 */

// Delay before initializing Typeform after script load (ms)
export const INITIAL_TIMEOUT = 300;

// Maximum number of retries for initialization
export const MAX_RETRIES = 3;

// Delay between retries (ms)
export const RETRY_DELAY = 500;

// URL for the Typeform embed script
export const TYPEFORM_SCRIPT_URL = 'https://embed.typeform.com/next/embed.js';

// Script source for Typeform embed
export const SCRIPT_SRC = 'embed.typeform.com';

// Global state tracking variables for Typeform script loading
export let isGlobalScriptLoading = false;
export let isGlobalScriptLoaded = false;

// Functions to update global script loading state
export const setGlobalScriptLoading = (value: boolean) => {
  isGlobalScriptLoading = value;
};

export const setGlobalScriptLoaded = (value: boolean) => {
  isGlobalScriptLoaded = value;
};
