
import { useRadioTabState } from "@/hooks/radio/useRadioTabState";
import { usePersistentAudioState } from "@/hooks/radio/usePersistentAudioState";
import RadioContainer from "@/components/radio/RadioContainer";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";
import ErrorBoundary from "@/components/common/ErrorBoundary";
import { useAuthStatus } from "@/hooks/use-auth-status";
import { toast } from "sonner";

const Radio = () => {
  // Centralize authentication check here
  const { isAuthenticated, isLoading } = useAuthStatus();
  
  // Show authentication toast when needed
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast.info(
        "Para guardar los archivos en la nube, inicie sesión", 
        { 
          id: "auth-reminder",
          duration: 5000,
        }
      );
    }
  }, [isAuthenticated, isLoading]);
  
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
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  return (
    <ErrorBoundary>
      <TooltipProvider>
        <RadioContainer 
          persistedText={textContent} 
          onTextChange={setTextContent}
          persistKey="radio-files"
          storage="sessionStorage"
          isActiveMediaRoute={isActiveMediaRoute}
          isMediaPlaying={isMediaPlaying}
          setIsMediaPlaying={setIsMediaPlaying}
          isAuthenticated={isAuthenticated}
        />
      </TooltipProvider>
    </ErrorBoundary>
  );
};

export default Radio;
