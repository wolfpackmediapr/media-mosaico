
import { useState, useId, useCallback } from "react";
import { toast } from "sonner";
import { useTypeformResourceManager } from "@/utils/typeform/typeform-resource-manager";
import TypeformContainer from "./TypeformContainer";
import { TypeformControls } from "./TypeformControls";
import { TypeformPrompt } from "./TypeformPrompt";
import { useTypeformInitializer } from "./TypeformInitializer";

interface TypeformEmbedProps {
  formId: string;
  title: string;
  description: string;
  isAuthenticated?: boolean | null;
}

/**
 * Main TypeformEmbed component that orchestrates all Typeform-related functionality
 */
const TypeformEmbed = ({ formId, title, description, isAuthenticated = true }: TypeformEmbedProps) => {
  const [showTypeform, setShowTypeform] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Generate unique ID for each reload to force remounting
  const initialId = useId();
  const [containerId, setContainerId] = useState<string>(initialId);
  
  // Get the resource manager for Typeform
  const resourceManager = useTypeformResourceManager();
  
  // Only initialize Typeform when authentication is valid AND user has chosen to show it
  const shouldInitialize = isAuthenticated === true && showTypeform;
  
  // Initialize typeform with the custom hook
  const { typeform, initializeTypeform, resetAttempts } = useTypeformInitializer({
    formId,
    enabled: shouldInitialize,
    onInitialized: () => console.log(`[TypeformEmbed] Form ${formId} initialized successfully`),
    onError: (error) => console.error(`[TypeformEmbed] Initialization error: ${error.message}`)
  });
  
  const handleShowTypeform = useCallback(() => {
    try {
      setShowTypeform(true);
      resetAttempts(); // Reset attempt counter
    } catch (err) {
      console.error(`[TypeformEmbed] Error showing form ${formId}:`, err);
      toast.error("Error al mostrar el formulario");
      setShowTypeform(false);
    }
  }, [resetAttempts, formId]);
  
  const handleHideTypeform = useCallback(() => {
    try {
      // Clean up typeform before hiding it
      if (typeform && typeof typeform.cleanup === 'function') {
        typeform.cleanup();
      }
      
      // Use resource manager to clean up, with error handling
      try {
        resourceManager.cleanupTypeformResources(formId);
      } catch (err) {
        console.error(`[TypeformEmbed] Error during resource cleanup:`, err);
      }
      
      setShowTypeform(false);
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
      if (typeform && typeof typeform.cleanup === 'function') {
        typeform.cleanup();
      }
      
      // Clean up Typeform resources using our specialized resource manager
      try {
        resourceManager.cleanupTypeformResources(formId);
      } catch (err) {
        console.error(`[TypeformEmbed] Error during resource cleanup on refresh:`, err);
        // Continue with refresh even if cleanup fails
      }
      
      // Generate a completely new ID to force React to fully remount the component
      const newContainerId = initialId + "-" + Date.now().toString();
      setContainerId(newContainerId);
      resetAttempts(); // Reset attempt counter
      
      // Wait for DOM changes to take effect
      setTimeout(() => {
        try {
          // Re-initialize the Typeform
          initializeTypeform();
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
  }, [typeform, resourceManager, formId, isRefreshing, initialId, initializeTypeform, resetAttempts]);

  return (
    <div className="mt-8 p-6 bg-muted rounded-lg w-full">
      {!showTypeform ? (
        <TypeformPrompt 
          title={title}
          description={description}
          isAuthenticated={isAuthenticated}
          onShow={handleShowTypeform}
        />
      ) : (
        <>
          <TypeformControls
            isRefreshing={isRefreshing}
            onRefresh={handleRefresh}
            onHide={handleHideTypeform}
          />
          <TypeformContainer
            formId={formId}
            className={`typeform-container-${containerId}`}
          />
        </>
      )}
    </div>
  );
};

export default TypeformEmbed;
