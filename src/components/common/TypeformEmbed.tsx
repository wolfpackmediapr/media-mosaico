
import { useState, useRef, useId, useEffect, useCallback } from "react";
import { useTypeform } from "@/hooks/use-typeform";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";
import { useTypeformResourceManager } from "@/utils/typeform/typeform-resource-manager";

interface TypeformEmbedProps {
  formId: string;
  title: string;
  description: string;
  isAuthenticated?: boolean | null;
}

const TypeformEmbed = ({ formId, title, description, isAuthenticated = true }: TypeformEmbedProps) => {
  const [showTypeform, setShowTypeform] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  // Generate unique ID for each reload to force remounting
  const [containerId, setContainerId] = useState<string>(useId());
  
  // Get the resource manager for Typeform
  const resourceManager = useTypeformResourceManager();
  
  // Only initialize Typeform when authentication is valid AND user has chosen to show it
  const shouldInitialize = isAuthenticated === true && showTypeform;
  
  // Pass options to disable microphone access by default
  const typeform = useTypeform(shouldInitialize, {
    disableMicrophone: true,
    keyboardShortcuts: true,
    lazy: true // Use lazy loading to prevent immediate initialization
  });
  
  // Register the container for cleanup when component unmounts or refreshes
  useEffect(() => {
    if (shouldInitialize && formId) {
      const cleanup = resourceManager.registerTypeformContainer(formId, containerId);
      
      return () => {
        cleanup();
      };
    }
  }, [resourceManager, formId, containerId, shouldInitialize]);
  
  const handleShowTypeform = useCallback(() => {
    setShowTypeform(true);
    // Wait a moment for the DOM to update before initializing
    setTimeout(() => {
      typeform.initialize();
    }, 300);
  }, [typeform]);
  
  const handleHideTypeform = useCallback(() => {
    // Clean up typeform before hiding it
    typeform.cleanup();
    setShowTypeform(false);
  }, [typeform]);
  
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
      
      // Generate a new container ID to force React to completely remount the component
      const newContainerId = useId();
      setContainerId(newContainerId);
      
      // Wait for DOM changes to take effect
      setTimeout(() => {
        try {
          // Reinitialize after DOM changes
          typeform.initialize();
          console.log(`[TypeformEmbed] Form ${formId} refreshed successfully`);
        } catch (err) {
          console.error(`[TypeformEmbed] Error reinitializing form ${formId}:`, err);
        } finally {
          // Always reset refresh state after a delay
          setTimeout(() => {
            setIsRefreshing(false);
          }, 500);
        }
      }, 500);
    } catch (err) {
      console.error(`[TypeformEmbed] Error during form ${formId} DOM refresh:`, err);
      setIsRefreshing(false);
    }
  }, [typeform, resourceManager, formId, isRefreshing]);
  
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
          <Button onClick={handleShowTypeform} className="mt-2">
            Cargar formulario
          </Button>
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
            className="h-[500px] md:h-[600px]"
          ></div>
        </>
      )}
    </div>
  );
};

export default TypeformEmbed;
