
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TypeformPromptProps {
  title: string;
  description: string;
  isAuthenticated: boolean | null;
  onShow: () => void;
}

/**
 * Component that displays the initial prompt to show Typeform
 */
export const TypeformPrompt = ({ 
  title, 
  description, 
  isAuthenticated, 
  onShow 
}: TypeformPromptProps) => {
  return (
    <div className="text-center py-8">
      <h2 className="text-2xl font-bold mb-4">{title}</h2>
      <p className="mb-4 text-muted-foreground">
        {description}
        <br />
        <span className="text-sm font-medium flex items-center justify-center mt-2 gap-1">
          <AlertCircle className="h-4 w-4" />
          Nota: El formulario puede solicitar acceso al micrófono para funcionalidad de voz.
        </span>
      </p>
      <Button 
        onClick={onShow} 
        className="mt-2"
        disabled={isAuthenticated !== true}
      >
        Cargar formulario
      </Button>
      {isAuthenticated === false && (
        <p className="mt-2 text-sm text-destructive">
          Debe iniciar sesión para usar esta funcionalidad.
        </p>
      )}
    </div>
  );
};

export default TypeformPrompt;
