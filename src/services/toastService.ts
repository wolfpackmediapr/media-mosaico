
import { toast as sonnerToast } from "sonner";

export const toast = sonnerToast;

export const useToast = () => {
  return {
    toast: {
      error: (message: string, options?: any) => sonnerToast.error(message, options),
      success: (message: string, options?: any) => sonnerToast.success(message, options),
      warning: (message: string, options?: any) => sonnerToast.warning(message, options),
      info: (message: string, options?: any) => sonnerToast.info(message, options),
    }
  };
};

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
