
import { toast as sonnerToast } from "sonner";
import { ToastProps } from "@/components/ui/toast";

// Direct Sonner toast export 
export const toast = sonnerToast;

// Legacy API compatible function - wraps Sonner's API to maintain backward compatibility
export const legacyToast = (props: {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
}) => {
  if (props.variant === "destructive") {
    sonnerToast.error(props.title || "", {
      description: props.description,
    });
  } else {
    sonnerToast.success(props.title || "", {
      description: props.description,
    });
  }
};

// Provide a hook with the same API as the old shadcn/ui toast
export const useToast = () => {
  return {
    toast: legacyToast
  };
};
