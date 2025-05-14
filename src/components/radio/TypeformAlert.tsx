
import { useState } from "react";
import { useTypeform } from "@/hooks/use-typeform";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface TypeformAlertProps {
  isAuthenticated: boolean | null;
}

const TypeformAlert = ({ isAuthenticated }: TypeformAlertProps) => {
  const [showTypeform, setShowTypeform] = useState(false);
  
  // Only initialize Typeform when authenticated AND user has chosen to show it
  // Pass options to disable microphone access by default
  const typeform = useTypeform(isAuthenticated === true && showTypeform, {
    disableMicrophone: true, // Prevent microphone access
    keyboardShortcuts: true,
    lazy: true // Use lazy loading to prevent immediate initialization
  });
  
  const handleShowTypeform = () => {
    setShowTypeform(true);
    // Wait a moment for the DOM to update before initializing
    setTimeout(() => {
      typeform.initialize();
    }, 200);
  };
  
  const handleHideTypeform = () => {
    // Clean up typeform before hiding it
    typeform.cleanup();
    setShowTypeform(false);
  };
  
  const handleRefresh = async () => {
    console.log("Radio Typeform refresh requested");
    
    // Use the new refresh method with feedback
    try {
      const success = await typeform.refresh();
      if (success) {
        console.log("Radio Typeform refreshed successfully");
        toast.success("Formulario actualizado correctamente");
      } else {
        console.warn("Radio Typeform refresh failed");
        toast.error("Error al actualizar el formulario");
      }
    } catch (err) {
      console.error("Error refreshing Radio Typeform:", err);
      toast.error("Error al actualizar el formulario");
    }
  };
  
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
          <Button onClick={handleShowTypeform} className="mt-2">
            Cargar formulario
          </Button>
        </div>
      ) : (
        <>
          <div className="flex justify-end mb-2 gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleRefresh}
              disabled={typeform.isRefreshing}
              aria-label="Reiniciar formulario"
              title="Reiniciar formulario"
            >
              <RefreshCw className={`h-4 w-4 ${typeform.isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleHideTypeform}
            >
              Ocultar formulario
            </Button>
          </div>
          <div className="relative">
            {typeform.isRefreshing && (
              <div className="absolute inset-0 z-10 bg-slate-100/60 flex items-center justify-center">
                <p className="text-slate-700 font-medium">Actualizando formulario...</p>
              </div>
            )}
            <div data-tf-live="01JEWES3GA7PPQN2SPRNHSVHPG" className="h-[500px] md:h-[600px]"></div>
          </div>
        </>
      )}
    </div>
  );
};

export default TypeformAlert;
