
import { useCallback, useState, useEffect } from "react";
import { useTypeform } from "@/hooks/use-typeform";
import { useTypeformResourceManager } from "@/utils/typeform/typeform-resource-manager";
import { toast } from "sonner";

interface TypeformInitializerProps {
  formId: string;
  enabled: boolean;
  onInitialized?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Component that handles Typeform initialization logic
 */
export const useTypeformInitializer = ({ 
  formId, 
  enabled, 
  onInitialized, 
  onError 
}: TypeformInitializerProps) => {
  const [initAttempts, setInitAttempts] = useState(0);
  const resourceManager = useTypeformResourceManager();
  
  // Pass options to disable microphone access by default
  const typeform = useTypeform(enabled, {
    disableMicrophone: true,
    keyboardShortcuts: true,
    lazy: true,
    sandboxMode: true
  });
  
  // Initialize typeform with retry logic
  const initializeTypeform = useCallback(() => {
    if (!enabled) return;
    
    console.log(`[TypeformInitializer] Initializing form ${formId}, attempt ${initAttempts + 1}`);
    
    try {
      // Make sure domain is set
      resourceManager.fixTypeformDomain();
      
      // Initialize with slight delay
      setTimeout(() => {
        try {
          typeform.initialize();
          console.log(`[TypeformInitializer] Form ${formId} initialized`);
          if (onInitialized) onInitialized();
        } catch (err) {
          console.error(`[TypeformInitializer] Error initializing form ${formId}:`, err);
          
          // Retry logic - attempt up to 3 times with increasing delay
          if (initAttempts < 3) {
            const nextAttempt = initAttempts + 1;
            setInitAttempts(nextAttempt);
            
            const delay = 500 * Math.pow(2, nextAttempt);
            console.log(`[TypeformInitializer] Retrying in ${delay}ms, attempt ${nextAttempt}/3`);
            
            setTimeout(() => {
              initializeTypeform();
            }, delay);
          } else {
            toast.error("Error al cargar el formulario. Por favor, inténtelo de nuevo.");
            if (onError && err instanceof Error) {
              onError(err);
            }
          }
        }
      }, 500);
    } catch (err) {
      console.error(`[TypeformInitializer] Error in initialization setup for form ${formId}:`, err);
      toast.error("Error al mostrar el formulario");
      if (onError && err instanceof Error) {
        onError(err);
      }
    }
  }, [typeform, formId, enabled, resourceManager, initAttempts, onInitialized, onError]);

  // Initialize when enabled changes to true
  useEffect(() => {
    if (enabled) {
      setInitAttempts(0); // Reset attempt counter when enabled changes
      
      // Short delay to ensure component is mounted
      setTimeout(() => {
        initializeTypeform();
      }, 100);
    }
  }, [enabled, initializeTypeform]);

  return {
    typeform,
    initializeTypeform,
    resetAttempts: () => setInitAttempts(0)
  };
};

