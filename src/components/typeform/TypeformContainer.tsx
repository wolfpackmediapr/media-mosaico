
import React, { useEffect } from 'react';
import { useTypeformResourceManager } from '@/hooks/typeform/use-typeform-resource-manager';
import { fixTypeformDomain } from '@/utils/typeform/core-utils';

interface TypeformContainerProps {
  formId: string;
  className?: string;
}

const TypeformContainer: React.FC<TypeformContainerProps> = ({ 
  formId, 
  className = 'typeform-container'
}) => {
  const containerId = `tf-${formId}`;
  const { registerContainer, unregisterContainer } = useTypeformResourceManager();

  // Apply domain fix on component mount
  useEffect(() => {
    try {
      fixTypeformDomain();
    } catch (err) {
      console.error(`[TypeformContainer] Error applying domain fix:`, err);
    }
  }, []);
  
  // Register the container with the resource manager
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    
    try {
      cleanup = registerContainer(formId, containerId);
    } catch (err) {
      console.error(`[TypeformContainer] Error registering container:`, err);
    }
    
    return () => {
      try {
        if (cleanup) {
          cleanup();
        } else {
          // Fallback if cleanup function wasn't set
          unregisterContainer(formId);
        }
      } catch (err) {
        console.error(`[TypeformContainer] Error cleaning up container:`, err);
        
        // Last resort attempt to remove from DOM directly
        try {
          const container = document.getElementById(containerId);
          if (container && container.parentNode) {
            container.parentNode.removeChild(container);
          }
        } catch (innerErr) {
          console.error(`[TypeformContainer] Final cleanup attempt failed:`, innerErr);
        }
      }
    };
  }, [formId, containerId, registerContainer, unregisterContainer]);

  return (
    <div 
      id={containerId} 
      className={className} 
      data-tf-widget={formId}
    />
  );
};

export default TypeformContainer;
