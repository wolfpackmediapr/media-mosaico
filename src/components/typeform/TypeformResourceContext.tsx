
import { createContext, useContext, ReactNode } from 'react';
import { useTypeformResourceManager } from '@/utils/typeform/typeform-resource-manager';

// Create context for typeform resource manager
const TypeformResourceContext = createContext<ReturnType<typeof useTypeformResourceManager> | null>(null);

// Provider component
export const TypeformResourceProvider = ({ children }: { children: ReactNode }) => {
  const resourceManager = useTypeformResourceManager();
  
  return (
    <TypeformResourceContext.Provider value={resourceManager}>
      {children}
    </TypeformResourceContext.Provider>
  );
};

// Custom hook to use the context
export const useTypeformResource = () => {
  const context = useContext(TypeformResourceContext);
  if (!context) {
    throw new Error('useTypeformResource must be used within a TypeformResourceProvider');
  }
  return context;
};
