
import { useState, useRef, useId, useEffect, useCallback } from "react";
import { useTypeform } from "@/hooks/use-typeform";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";
import { useTypeformResourceManager } from "@/utils/typeform/typeform-resource-manager";
import { toast } from "sonner";

interface TypeformEmbedProps {
  formId: string;
  title: string;
  description: string;
  isAuthenticated?: boolean | null;
}

const TypeformEmbed = ({ formId, title, description, isAuthenticated = true }: TypeformEmbedProps) => {
  const [showTypeform, setShowTypeform] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [initAttempts, setInitAttempts] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  // Generate unique ID for each reload to force remounting
  const initialId = useId();
  const [containerId, setContainerId] = useState<string>(initialId);
  
  // Get the resource manager for Typeform
  const resourceManager = useTypeformResourceManager();
  
  // Only initialize Typeform when authentication is valid AND user has chosen to show it
  const shouldInitialize = isAuthenticated === true && showTypeform;
  
  // Pass options to disable microphone access by default
  const typeform = useTypeform(shouldInitialize, {
    disableMicrophone: true,
    keyboardShortcuts: true,
    lazy: true, // Use lazy loading to prevent immediate initialization
    sandboxMode: true // Enable sandbox mode for security
  });
  
  // Make sure domain is set before initializing
  useEffect(() => {
    resourceManager.fixTypeformDomain();
  }, [resourceManager, showTypeform]);
  
  // Register the container for cleanup when component unmounts or refreshes
  useEffect(() => {
    if (shouldInitialize && formId) {
      const cleanup = resourceManager.registerTypeformContainer(formId, containerId);
      
      return () => {
        cleanup();
      };
    }
  }, [resourceManager, formId, containerId, shouldInitialize]);
  
  // Initialize typeform with retry logic
  const initializeTypeform = useCallback(() => {
    if (!shouldInitialize) return;
    
    console.log(`[TypeformEmbed] Initializing form ${formId}, attempt ${initAttempts + 1}`);
    
    try {
      // Make sure domain is set
      resourceManager.fixTypeformDomain();
      
      // Initialize with slight delay
      setTimeout(() => {
        try {
          typeform.initialize();
          console.log(`[TypeformEmbed] Form ${formId} initialized`);
        } catch (err) {
          console.error(`[TypeformEmbed] Error initializing form ${formId}:`, err);
          
          // Retry logic - attempt up to 3 times with increasing delay
          if (initAttempts < 3) {
            const nextAttempt = initAttempts + 1;
            setInitAttempts(nextAttempt);
            
            const delay = 500 * Math.pow(2, nextAttempt);
            console.log(`[TypeformEmbed] Retrying in ${delay}ms, attempt ${nextAttempt}/3`);
            
            setTimeout(() => {
              initializeTypeform();
            }, delay);
          } else {
            toast.error("Error al cargar el formulario. Por favor, inténtelo de nuevo.");
          }
        }
      }, 500);
    } catch (err) {
      console.error(`[TypeformEmbed] Error in initialization setup for form ${formId}:`, err);
      toast.error("Error al mostrar el formulario");
    }
  }, [typeform, formId, shouldInitialize, resourceManager, initAttempts]);
  
  const handleShowTypeform = useCallback(() => {
    try {
      setShowTypeform(true);
      setInitAttempts(0); // Reset attempt counter
      
      // Let the component fully render before initializing
      setTimeout(() => {
        initializeTypeform();
      }, 100);
    } catch (err) {
      console.error(`[TypeformEmbed] Error showing form ${formId}:`, err);
      toast.error("Error al mostrar el formulario");
      setShowTypeform(false);
    }
  }, [initializeTypeform, formId]);
  
  const handleHideTypeform = useCallback(() => {
    try {
      // Clean up typeform before hiding it
      typeform.cleanup();
      resourceManager.cleanupTypeformResources(formId);
      setShowTypeform(false);
      setInitAttempts(0); // Reset attempt counter
    } catch (err) {
      console.error(`[TypeformEmbed] Error hiding form ${formId}:`, err);
      // Force hiding even if there was an error
      setShowTypeform(false);
    }
  }, [typeform, resourceManager, formId]);
  
  const handleRefresh = useCallback(() => {
    // Prevent multiple refreshes
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    console.log(`[TypeformEmbed] Refreshing form ${formId}`);
    
    try {
      // First, clean up the current typeform instance
      typeform.cleanup();
      
      // Clean up Typeform resources using our specialized resource manager
      resourceManager.cleanupTypeformResources(formId);
      
      // Generate a completely new ID to force React to fully remount the component
      const newContainerId = initialId + "-" + Date.now().toString();
      setContainerId(newContainerId);
      setInitAttempts(0); // Reset attempt counter
      
      // Wait for DOM changes to take effect
      setTimeout(() => {
        try {
          // Make sure domain is set correctly
          resourceManager.fixTypeformDomain();
          
          // Re-initialize the Typeform
          typeform.initialize();
          console.log(`[TypeformEmbed] Form ${formId} refreshed successfully`);
          toast.success("Formulario actualizado correctamente");
        } catch (err) {
          console.error(`[TypeformEmbed] Error reinitializing form ${formId}:`, err);
          toast.error("Error al reinicializar el formulario");
        } finally {
          // Always reset refresh state after a delay
          setTimeout(() => {
            setIsRefreshing(false);
          }, 500);
        }
      }, 800); // Extended delay to ensure DOM is fully updated
    } catch (err) {
      console.error(`[TypeformEmbed] Error during form ${formId} DOM refresh:`, err);
      toast.error("Error al actualizar el formulario");
      setIsRefreshing(false);
    }
  }, [typeform, resourceManager, formId, isRefreshing, initialId]);
  
  // Add effect to handle component unmounting
  useEffect(() => {
    return () => {
      // Ensure typeform is cleaned up when component unmounts
      if (typeform) {
        typeform.cleanup();
      }
      
      // Also clean up any Typeform resources
      if (formId) {
        resourceManager.cleanupTypeformResources(formId);
      }
    };
  }, [typeform, resourceManager, formId]);

  // Add effect to log authentication status changes
  useEffect(() => {
    console.log(`[TypeformEmbed] Auth status changed: ${isAuthenticated}`);
  }, [isAuthenticated]);
  
  return (
    <div className="mt-8 p-6 bg-muted rounded-lg w-full">
      <h2 className="text-2xl font-bold mb-4">{title}</h2>
      
      {!showTypeform ? (
        <div className="text-center py-8">
          <p className="mb-4 text-muted-foreground">
            {description}
            <br />
            <span className="text-sm font-medium flex items-center justify-center mt-2 gap-1">
              <AlertCircle className="h-4 w-4" />
              Nota: El formulario puede solicitar acceso al micrófono para funcionalidad de voz.
            </span>
          </p>
          <Button 
            onClick={handleShowTypeform} 
            className="mt-2"
            disabled={isAuthenticated !== true}
          >
            Cargar formulario
          </Button>
          {isAuthenticated === false && (
            <p className="mt-2 text-sm text-destructive">
              Debe iniciar sesión para usar esta funcionalidad.
            </p>
          )}
        </div>
      ) : (
        <>
          <div className="flex justify-end mb-2 gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              aria-label="Reiniciar formulario"
              title="Reiniciar formulario"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleHideTypeform}
            >
              Ocultar formulario
            </Button>
          </div>
          <div 
            ref={containerRef} 
            key={containerId} 
            data-tf-live={formId} 
            className="h-[500px] md:h-[600px] bg-background border border-border rounded-md"
            id={`typeform-container-${containerId}`}
          ></div>
        </>
      )}
    </div>
  );
};

export default TypeformEmbed;
