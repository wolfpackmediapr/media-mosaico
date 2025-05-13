
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
    fixTypeformDomain();
  }, []);
  
  // Register the container with the resource manager
  useEffect(() => {
    registerContainer(formId, containerId);
    
    return () => {
      unregisterContainer(formId);
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
