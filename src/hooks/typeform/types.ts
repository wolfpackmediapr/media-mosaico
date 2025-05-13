
/**
 * TypeScript type definitions for Typeform integration
 */

export interface TypeformOptions {
  /** Disable microphone access (defaults to true for privacy) */
  disableMicrophone?: boolean;
  /** Enable keyboard shortcuts for navigation (defaults to true) */
  keyboardShortcuts?: boolean;
  /** Allow lazy loading to prevent immediate initialization */
  lazy?: boolean;
  /** Enable sandbox mode for security (defaults to true) */
  sandboxMode?: boolean;
}

export interface TypeformHookReturn {
  /** Initialize the Typeform widget manually */
  initialize: () => void;
  /** Cleanup the Typeform widget and resources */
  cleanup: () => void;
  /** Whether the Typeform widget is initialized */
  isInitialized: boolean;
  /** Whether the Typeform script is currently loading */
  isLoading: boolean;
  /** Any error that occurred during initialization */
  error: Error | null;
}

export interface ScriptLoaderReturn {
  isScriptLoading: boolean;
  isScriptLoaded: boolean;
  loadScript: () => void;
}
