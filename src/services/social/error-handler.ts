
import { toast } from "sonner";

// Error message mapping
const ERROR_MESSAGES = {
  platforms: "No se pudieron cargar las plataformas",
  posts: "No se pudieron cargar las publicaciones",
  refresh: "No se pudieron actualizar los feeds",
  auth: "Debe iniciar sesión para actualizar el feed",
  feed: "No se pudo cargar el feed",
  timeout: "La operación tomó demasiado tiempo",
  network: "Error de conexión de red",
  default: "Ha ocurrido un error inesperado"
};

export const handleSocialFeedError = (
  error: unknown, 
  errorType: keyof typeof ERROR_MESSAGES | string
) => {
  console.error(`Error ${errorType}:`, error);
  
  // Type guard to check if error has name property
  const hasName = (err: unknown): err is { name: string } => 
    typeof err === 'object' && err !== null && 'name' in err;
  
  // Type guard to check if error has message property
  const hasMessage = (err: unknown): err is { message: string } => 
    typeof err === 'object' && err !== null && 'message' in err;
  
  // Determine if it's a timeout error
  const isTimeout = error && (
    (hasName(error) && error.name === 'AbortError') || 
    (hasMessage(error) && error.message.includes('timeout'))
  );
  
  // Determine if it's a network error
  const isNetworkError = error && (
    (hasName(error) && error.name === 'NetworkError') ||
    (hasMessage(error) && (
      error.message.includes('network') ||
      error.message.includes('Failed to fetch') ||
      error.message.includes('Network request failed')
    ))
  );
  
  // Choose the appropriate error message
  let errorMessage;
  if (isTimeout) {
    errorMessage = ERROR_MESSAGES.timeout;
  } else if (isNetworkError) {
    errorMessage = ERROR_MESSAGES.network;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  } else {
    errorMessage = ERROR_MESSAGES[errorType as keyof typeof ERROR_MESSAGES] || ERROR_MESSAGES.default;
  }

  toast.error(errorMessage, {
    description: error instanceof Error ? error.message.substring(0, 100) : undefined,
  });
};
