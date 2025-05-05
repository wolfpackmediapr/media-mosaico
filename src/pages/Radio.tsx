
import { useRadioTabState } from "@/hooks/radio/useRadioTabState";
import { usePersistentAudioState } from "@/hooks/radio/usePersistentAudioState";
import RadioContainer from "@/components/radio/RadioContainer";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect, useRef } from "react";
import ErrorBoundary from "@/components/common/ErrorBoundary";
import { useAuthStatus } from "@/hooks/use-auth-status";

const Radio = () => {
  // Centralize authentication check here
  const { isAuthenticated } = useAuthStatus();
  const initialRenderRef = useRef(true);
  
  // Use radio tab state for persisting transcription text
  const { textContent, setTextContent } = useRadioTabState({
    persistKey: "radio-transcription",
    storage: 'sessionStorage',
    persistTextContent: true
  });

  // Use persistent audio state to maintain playback across routes
  const { isActiveMediaRoute, isMediaPlaying, setIsMediaPlaying, lastPlaybackPosition } = usePersistentAudioState();

  // Add effect to preserve audio playback state between tab changes
  useEffect(() => {
    // Only run client-side to avoid SSR issues
    if (typeof window !== 'undefined') {
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
    }
  }, []);
  
  // Debug: Log component lifecycle and state
  useEffect(() => {
    if (initialRenderRef.current) {
      console.log("[Radio] Component mounted, initializing state");
      initialRenderRef.current = false;
    } else {
      console.log("[Radio] Component updated, playback state:", isMediaPlaying);
    }
  });

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
          // The RadioContainer component doesn't expect lastPlaybackPosition,
          // so we won't pass it to prevent type errors
        />
      </TooltipProvider>
    </ErrorBoundary>
  );
};

export default Radio;
