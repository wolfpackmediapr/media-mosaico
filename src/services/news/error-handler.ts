
import { useToast } from "@/hooks/use-toast";

// Error message mapping
const ERROR_MESSAGES = {
  sources: "No se pudieron cargar las fuentes de noticias",
  articles: "No se pudieron cargar los artículos",
  refresh: "No se pudo actualizar el feed de noticias",
  auth: "Debe iniciar sesión para actualizar el feed",
  default: "Ha ocurrido un error inesperado"
};

// Error handler utility function
export const handleNewsFeedError = (
  error: unknown, 
  errorType: keyof typeof ERROR_MESSAGES, 
  toast: ReturnType<typeof useToast>["toast"]
) => {
  console.error(`Error ${errorType}:`, error);
  
  const errorMessage = error instanceof Error 
    ? error.message 
    : ERROR_MESSAGES[errorType] || ERROR_MESSAGES.default;

  toast({
    title: "Error",
    description: errorMessage,
    variant: "destructive",
  });
};
