
import { useRadioTabState } from "@/hooks/radio/useRadioTabState";
import { usePersistentAudioState } from "@/hooks/radio/usePersistentAudioState";
import RadioContainer from "@/components/radio/RadioContainer";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect, useState } from "react";
import ErrorBoundary from "@/components/common/ErrorBoundary";
import { useAuthStatus } from "@/hooks/use-auth-status";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const Radio = () => {
  // Check authentication status
  const { isAuthenticated } = useAuthStatus();
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  
  // Use radio tab state for persisting transcription text
  const { textContent, setTextContent } = useRadioTabState({
    persistKey: "radio-transcription",
    storage: 'sessionStorage',
    persistTextContent: true
  });

  // Use persistent audio state to maintain playback across routes
  const { isActiveMediaRoute, isMediaPlaying, setIsMediaPlaying } = usePersistentAudioState();

  // Add effect to preserve audio playback state between tab changes
  useEffect(() => {
    // Store the current route to identify when user returns to this page
    sessionStorage.setItem('last-active-route', '/radio');
    
    // Listen for beforeunload to properly save state before tab changes
    const handleBeforeUnload = () => {
      // This ensures state is saved before navigating away
      console.log("[Radio] Preserving state before navigation");
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    setIsLoading(false);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-pulse text-center">
          <p>Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <TooltipProvider>
        {!isAuthenticated && (
          <Alert className="mb-4">
            <Info className="h-4 w-4" />
            <AlertTitle>Iniciar sesión recomendado</AlertTitle>
            <AlertDescription>
              <p className="mb-2">
                Para guardar tus archivos de audio y transcripciones de manera permanente,
                inicia sesión en tu cuenta.
              </p>
              <Button 
                onClick={() => navigate('/login')}
                size="sm"
                variant="outline"
              >
                Iniciar sesión
              </Button>
            </AlertDescription>
          </Alert>
        )}
        <RadioContainer 
          persistedText={textContent} 
          onTextChange={setTextContent}
          persistKey="radio-files"
          storage="sessionStorage"
          isActiveMediaRoute={isActiveMediaRoute}
          isMediaPlaying={isMediaPlaying}
          setIsMediaPlaying={setIsMediaPlaying}
        />
      </TooltipProvider>
    </ErrorBoundary>
  );
};

export default Radio;
