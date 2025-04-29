
import { toast } from 'sonner';

// Re-export the Sonner toast for backward compatibility
export { toast };

// For components expecting the old toast API structure
export const useToast = () => {
  return {
    toast: {
      // Map the old toast API to Sonner
      call: function(options: any): void {
        if (!options) return;
        
        if (options.variant === 'destructive') {
          toast.error(options.title, {
            description: options.description
          });
        } else {
          toast.success(options.title, {
            description: options.description
          });
        }
      },
      // Add specific toast variants for compatibility
      error: function(title: string, description?: string): void {
        toast.error(title, { description });
      },
      success: function(title: string, description?: string): void {
        toast.success(title, { description });
      },
      warning: function(title: string, description?: string): void {
        toast.warning(title, { description });
      },
      info: function(title: string, description?: string): void {
        toast.info(title, { description });
      }
    }
  };
};
