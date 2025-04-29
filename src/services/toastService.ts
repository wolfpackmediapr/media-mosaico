
import { toast as sonnerToast } from "sonner";

// Export the direct sonner toast function for convenience
export const toast = sonnerToast;

// Provide a hook with the same API as the old shadcn/ui toast
export const useToast = () => {
  return {
    toast: sonnerToast
  };
};

// Legacy toast function for backward compatibility
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
