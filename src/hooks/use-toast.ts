
import { toast as sonnerToast } from 'sonner';

// Re-export the Sonner toast for backward compatibility
export { sonnerToast as toast };

// For components expecting the old toast API structure
export const useToast = () => {
  // Create a callable function that also has methods
  const toastFunction = (options: any) => {
    if (!options) return;
    
    if (options.variant === 'destructive') {
      sonnerToast.error(options.title, {
        description: options.description
      });
    } else {
      sonnerToast.success(options.title, {
        description: options.description
      });
    }
  };

  // Add the callable methods
  const toast = Object.assign(toastFunction, {
    call: function(options: any): void {
      if (!options) return;
      
      if (options.variant === 'destructive') {
        sonnerToast.error(options.title, {
          description: options.description
        });
      } else {
        sonnerToast.success(options.title, {
          description: options.description
        });
      }
    },
    error: function(title: string, description?: string): void {
      sonnerToast.error(title, { description });
    },
    success: function(title: string, description?: string): void {
      sonnerToast.success(title, { description });
    },
    warning: function(title: string, description?: string): void {
      sonnerToast.warning(title, { description });
    },
    info: function(title: string, description?: string): void {
      sonnerToast.info(title, { description });
    }
  });

  return { toast };
};
