
import { toast as sonnerToast } from 'sonner';

// Re-export the Sonner toast for direct usage
export const toast = sonnerToast;

// For components expecting the old toast API structure
export const useToast = () => {
  return {
    toast: sonnerToast
  };
};
