
import { useState } from "react";
import { useTypeform } from "@/hooks/use-typeform";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

interface TypeformAlertProps {
  isAuthenticated: boolean | null;
}

const TypeformAlert = ({ isAuthenticated }: TypeformAlertProps) => {
  const [showTypeform, setShowTypeform] = useState(false);
  
  // Only initialize Typeform when authenticated AND user has chosen to show it
  useTypeform(isAuthenticated === true && showTypeform);
  
  return (
    <div className="mt-8 p-6 bg-muted rounded-lg w-full">
      <h2 className="text-2xl font-bold mb-4">Alerta Radio</h2>
      
      {!showTypeform ? (
        <div className="text-center py-8">
          <p className="mb-4 text-muted-foreground">
            Haga clic en el botón a continuación para cargar el formulario de alerta de radio.
            <br />
            <span className="text-sm font-medium flex items-center justify-center mt-2 gap-1">
              <AlertCircle className="h-4 w-4" />
              Nota: El formulario puede solicitar acceso al micrófono para funcionalidad de voz.
            </span>
          </p>
          <Button onClick={() => setShowTypeform(true)} className="mt-2">
            Cargar formulario
          </Button>
        </div>
      ) : (
        <>
          <div className="flex justify-end mb-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowTypeform(false)}
            >
              Ocultar formulario
            </Button>
          </div>
          <div data-tf-live="01JEWES3GA7PPQN2SPRNHSVHPG" className="h-[500px] md:h-[600px]"></div>
        </>
      )}
    </div>
  );
};

export default TypeformAlert;
