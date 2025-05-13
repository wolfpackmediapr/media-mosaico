
import { useRef, useEffect, useState, useCallback } from 'react';
import { loadTypeformScript } from './use-typeform-script';
import { fixTypeformDomain, safeCreateWidget } from '@/utils/typeform/core-utils';
import { ensureTfObject } from '@/utils/typeform/utils';

// Configuration interface for the Typeform widget
interface TypeformWidgetConfig {
  formId: string;
  container: string | HTMLElement;
  enableSandbox?: boolean;
  disableTracking?: boolean;
  hidden?: Record<string, any>;
  onSubmit?: (event: TypeformSubmitEvent) => void;
  onReady?: () => void;
  onQuestionChanged?: (event: TypeformQuestionChangedEvent) => void;
  autoClose?: boolean | number;
  transitiveSearchParams?: string[];
  source?: string;
  medium?: string;
  mediumVersion?: string;
  hideFooter?: boolean;
  hideHeaders?: boolean;
  opacity?: number;
  buttonText?: string;
  customIcon?: string;
  disableAutoFocus?: boolean;
  open?: 'scroll' | 'exit-intent' | 'load' | 'time';
  openValue?: number;
}

// Interface definitions for Typeform events
interface TypeformSubmitEvent {
  response_id: string;
}

interface TypeformQuestionChangedEvent {
  ref: string;
}

export const useTypeformWidget = (config: TypeformWidgetConfig) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const widgetRef = useRef<any>(null);

  // Safely initialize the widget with domain checks
  const initializeWidget = useCallback(() => {
    try {
      // Early domain setup attempt
      ensureTfObject();
      fixTypeformDomain(true);
      
      if (!window.tf || typeof window.tf.createWidget !== 'function') {
        console.log('[useTypeformWidget] Typeform library not fully loaded, waiting...');
        return false;
      }

      // Apply config and defaults
      const widgetConfig = {
        ...config,
        onReady: () => {
          setIsReady(true);
          if (config.onReady) config.onReady();
        }
      };

      // Create widget with safe wrapper
      const widget = safeCreateWidget(widgetConfig);
      
      if (!widget) {
        setError('Failed to create Typeform widget');
        return false;
      }

      widgetRef.current = widget;
      return true;
    } catch (error) {
      console.error('[useTypeformWidget] Error during manual Typeform initialization:', error);
      setError(`Error initializing Typeform: ${error}`);
      return false;
    }
  }, [config]);

  // Load the Typeform script and initialize the widget
  useEffect(() => {
    if (!config.formId || !config.container) {
      setError('Missing required formId or container');
      return;
    }

    // First attempt at domain setup
    ensureTfObject();
    fixTypeformDomain();

    // Load the Typeform script if it's not already loaded
    loadTypeformScript()
      .then(() => {
        console.log('[useTypeformWidget] Typeform script loaded successfully');
        setIsLoaded(true);
        
        // Second attempt at domain setup after script is loaded
        setTimeout(() => {
          console.log('[useTypeformWidget] Attempting to initialize widget after script load');
          fixTypeformDomain(true);
          initializeWidget();
        }, 100);
      })
      .catch((error) => {
        console.error('[useTypeformWidget] Error loading Typeform script:', error);
        setError(`Error loading Typeform script: ${error}`);
      });

    // Cleanup function to remove the widget
    return () => {
      if (widgetRef.current) {
        try {
          console.log('[useTypeformWidget] Cleaning up Typeform widget');
          widgetRef.current = null;
        } catch (error) {
          console.error('[useTypeformWidget] Error cleaning up Typeform widget:', error);
        }
      }
    };
  }, [config.formId, config.container, initializeWidget]);

  return {
    isLoaded,
    isReady,
    error,
    widget: widgetRef.current
  };
};
