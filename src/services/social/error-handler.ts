
import { useToast } from "@/hooks/use-toast";

// Error message mapping
const ERROR_MESSAGES = {
  platforms: "No se pudieron cargar las plataformas",
  posts: "No se pudieron cargar las publicaciones",
  refresh: "No se pudieron actualizar los feeds",
  auth: "Debe iniciar sesión para actualizar el feed",
  feed: "No se pudo cargar el feed de Jay Fonseca",
  default: "Ha ocurrido un error inesperado"
};

// Error handler utility function
export const handleSocialFeedError = (
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
