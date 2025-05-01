
import { toast as sonnerToast } from 'sonner';
import { ToastProps } from "@/components/ui/toast";

// Direct Sonner toast export for those who prefer to use it directly
export const toast = sonnerToast;

// Legacy API compatible function - wraps Sonner's API with shadcn/ui's original API
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

// For components expecting the old toast API structure
export const useToast = () => {
  return {
    toast: legacyToast
  };
};
