
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface TypeformErrorProps {
  message?: string;
  onRetry?: () => void;
  isRetrying?: boolean;
}

export const TypeformError = ({ 
  message = "Error al cargar el formulario", 
  onRetry,
  isRetrying = false
}: TypeformErrorProps) => {
  return (
    <div className="p-4 border border-destructive/30 bg-destructive/10 rounded-md flex flex-col items-center justify-center text-center">
      <AlertTriangle className="h-8 w-8 text-destructive mb-2" />
      <p className="text-destructive font-medium mb-2">{message}</p>
      
      {onRetry && (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onRetry}
          disabled={isRetrying}
          className="mt-2"
        >
          {isRetrying ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Reintentando...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Reintentar
            </>
          )}
        </Button>
      )}
    </div>
  );
};
