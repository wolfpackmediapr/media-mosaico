
import { useState, useRef, useId } from "react";
import { useTypeform } from "@/hooks/use-typeform";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";

interface TypeformAlertProps {
  isAuthenticated: boolean | null;
}

const TypeformAlert = ({ isAuthenticated }: TypeformAlertProps) => {
  const [showTypeform, setShowTypeform] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  // Generate unique ID for each reload to force remounting
  const [containerId, setContainerId] = useState<string>(useId());
  
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
    }, 300);
  };
  
  const handleHideTypeform = () => {
    // Clean up typeform before hiding it
    typeform.cleanup();
    setShowTypeform(false);
  };
  
  const handleRefresh = () => {
    // Prevent multiple refreshes
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    
    try {
      // First, clean up the current typeform instance
      typeform.cleanup();
      
      // Find and remove all typeform-related elements
      const typeformElements = document.querySelectorAll('[data-tf-live]');
      typeformElements.forEach(element => {
        if (element.parentNode) {
          element.parentNode.removeChild(element);
        }
      });
      
      // Also remove any Typeform-generated iframes or scripts that might be leftover
      const iframes = document.querySelectorAll('iframe[src*="typeform"]');
      iframes.forEach(iframe => {
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
      });
      
      // Change container ID to force React to completely remount the component
      setContainerId(useId());
      
      // Wait a moment for DOM changes to take effect
      setTimeout(() => {
        try {
          // Reinitialize after DOM changes
          typeform.initialize();
          console.log("Typeform refreshed successfully with complete DOM reload");
        } catch (err) {
          console.error("Error reinitializing Typeform after DOM reload:", err);
        } finally {
          // Always reset refresh state
          setTimeout(() => {
            setIsRefreshing(false);
          }, 500);
        }
      }, 500);
    } catch (err) {
      console.error("Error during Typeform DOM refresh:", err);
      setIsRefreshing(false);
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
              disabled={isRefreshing}
              aria-label="Reiniciar formulario"
              title="Reiniciar formulario"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleHideTypeform}
            >
              Ocultar formulario
            </Button>
          </div>
          <div ref={containerRef} key={containerId} data-tf-live="01JEWES3GA7PPQN2SPRNHSVHPG" className="h-[500px] md:h-[600px]"></div>
        </>
      )}
    </div>
  );
};

export default TypeformAlert;
