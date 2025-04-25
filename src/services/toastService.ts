
// Utility that re-exports toast functionality
// This file serves as a central place for toast functionality
// and helps ensure consistency across the application

import { toast as sonnerToast } from "sonner";

// Export the toast function directly
export const toast = sonnerToast;

// For components expecting the old toast API structure
export const useToast = () => {
  return {
    toast: {
      // Map the old toast API to Sonner
      error: (message: string, options?: any) => sonnerToast.error(message, options),
      success: (message: string, options?: any) => sonnerToast.success(message, options),
      warning: (message: string, options?: any) => sonnerToast.warning(message, options),
      info: (message: string, options?: any) => sonnerToast.info(message, options),
    }
  };
};

// Legacy API compatibility
export const legacyToast = (options: {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
}) => {
  if (options.variant === "destructive") {
    sonnerToast.error(options.title || "", {
      description: options.description,
    });
  } else {
    sonnerToast.success(options.title || "", {
      description: options.description,
    });
  }
};
