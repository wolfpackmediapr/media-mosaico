
import { useState } from "react";
import { useTypeform } from "@/hooks/use-typeform";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

const TvTypeformEmbed = () => {
  const [showTypeform, setShowTypeform] = useState(false);
  
  // Only initialize Typeform when user has chosen to show it
  // Pass options to disable microphone access by default
  const typeform = useTypeform(showTypeform, {
    disableMicrophone: true, // Prevent microphone access
    keyboardShortcuts: true,
    lazy: true // Use lazy loading to prevent immediate initialization
  });
  
  const handleShowTypeform = () => {
    setShowTypeform(true);
    // Wait a moment for the DOM to update before initializing
    setTimeout(() => {
      typeform.initialize();
    }, 100);
  };
  
  const handleHideTypeform = () => {
    // Clean up typeform before hiding it
    typeform.cleanup();
    setShowTypeform(false);
  };
  
  return (
    <div className="mt-8 p-6 bg-muted rounded-lg w-full">
      <h2 className="text-2xl font-bold mb-4">Alerta TV</h2>
      
      {!showTypeform ? (
        <div className="text-center py-8">
          <p className="mb-4 text-muted-foreground">
            Haga clic en el botón a continuación para cargar el formulario de alerta de TV.
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
          <div className="flex justify-end mb-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleHideTypeform}
            >
              Ocultar formulario
            </Button>
          </div>
          <div data-tf-live="01JEWEP95CN5YH8JCET8GEXRSK" className="h-[500px] md:h-[600px]"></div>
        </>
      )}
    </div>
  );
};

export default TvTypeformEmbed;
