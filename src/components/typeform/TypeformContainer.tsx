
import { useState, useRef, useId, useEffect } from "react";
import { useTypeformResourceManager } from "@/utils/typeform/typeform-resource-manager";

interface TypeformContainerProps {
  formId: string;
  containerId: string;
  onRefresh?: () => void;
}

/**
 * Container component that renders the actual Typeform embed
 */
export const TypeformContainer = ({ formId, containerId, onRefresh }: TypeformContainerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const resourceManager = useTypeformResourceManager();
  
  // Register the container for cleanup when component unmounts or refreshes
  useEffect(() => {
    if (formId) {
      const cleanup = resourceManager.registerTypeformContainer(formId, containerId);
      
      return () => {
        cleanup();
      };
    }
  }, [resourceManager, formId, containerId]);
  
  // Add effect to ensure Typeform domain is set properly
  useEffect(() => {
    resourceManager.fixTypeformDomain();
  }, [resourceManager]);

  return (
    <div 
      ref={containerRef} 
      key={containerId} 
      data-tf-live={formId} 
      className="h-[500px] md:h-[600px] bg-background border border-border rounded-md"
      id={`typeform-container-${containerId}`}
    ></div>
  );
};

