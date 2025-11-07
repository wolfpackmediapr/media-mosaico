import { toast as shadcnToast } from "@/hooks/use-toast";
import { ERROR_MESSAGES } from "./constants";

export class ProcessingError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'ProcessingError';
  }
}

export const handleError = (
  error: unknown,
  fallbackMessage: string = ERROR_MESSAGES.PROCESSING_ERROR
): string => {
  const errorMessage = error instanceof Error ? error.message : fallbackMessage;
  console.error("Processing error:", error);
  return errorMessage;
};

export const showErrorToast = (
  title: string,
  description: string
) => {
  shadcnToast({
    title,
    description,
    variant: "destructive"
  } as any);
};

export const showSuccessToast = (
  title: string,
  description: string
) => {
  shadcnToast({
    title,
    description,
  } as any);
};

export const showInfoToast = (
  title: string,
  description: string
) => {
  shadcnToast({
    title,
    description,
  } as any);
};
