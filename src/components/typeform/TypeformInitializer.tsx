
import React, { useEffect, useState, useRef } from 'react';
import { useTypeformWidget } from '@/hooks/typeform/use-typeform-widget';
import { fixTypeformDomain, ensureTypeformInitialized } from '@/utils/typeform/core-utils';

interface TypeformInitializerProps {
  formId: string;
  containerId?: string;
  onSubmit?: (responseId: string) => void;
  onReady?: () => void;
  hidden?: Record<string, any>;
}

const TypeformInitializer: React.FC<TypeformInitializerProps> = ({
  formId,
  containerId = `typeform-${formId}`,
  onSubmit,
  onReady,
  hidden = {}
}) => {
  const [initialized, setInitialized] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const maxAttempts = 3;
  const attemptTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Pre-initialization domain fix
  useEffect(() => {
    fixTypeformDomain(true);
  }, []);

  // Handle form initialization with retry logic
  const initializeForm = () => {
    if (attempts >= maxAttempts) {
      console.error(`[TypeformInitializer] Failed to initialize form ${formId} after ${maxAttempts} attempts`);
      return;
    }

    const newAttemptCount = attempts + 1;
    setAttempts(newAttemptCount);
    
    console.log(`[TypeformInitializer] Initializing form ${formId}, attempt ${newAttemptCount}`);
    
    // Ensure Typeform is ready before initialization
    const isTypeformReady = ensureTypeformInitialized();
    
    if (!isTypeformReady) {
      console.log(`[TypeformInitializer] Typeform not ready, will retry in 300ms`);
      attemptTimerRef.current = setTimeout(initializeForm, 300);
      return;
    }
    
    setInitialized(true);
  };

  // Start initialization process after a short delay
  useEffect(() => {
    attemptTimerRef.current = setTimeout(initializeForm, 100);
    
    return () => {
      if (attemptTimerRef.current) {
        clearTimeout(attemptTimerRef.current);
      }
    };
  }, []);

  // Configure and initialize the Typeform widget once we've verified library is ready
  const { isReady, error } = useTypeformWidget(
    initialized
      ? {
          formId,
          container: containerId,
          hideFooter: true,
          hideHeaders: false,
          opacity: 100,
          buttonText: 'Start',
          onSubmit: (event) => {
            if (onSubmit) onSubmit(event.response_id);
          },
          onReady: () => {
            console.log(`[TypeformInitializer] Form ${formId} initialized`);
            if (onReady) onReady();
          },
          hidden
        }
      : { 
          formId: '', 
          container: '' 
        }
  );

  useEffect(() => {
    if (error) {
      console.error(`[TypeformInitializer] Error initializing form ${formId}:`, error);
    }
  }, [error, formId]);

  return null;
};

export default TypeformInitializer;
