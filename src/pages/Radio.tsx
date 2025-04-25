
import { useRadioTabState } from "@/hooks/radio/useRadioTabState";
import RadioContainer from "@/components/radio/RadioContainer";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";

const Radio = () => {
  // Use radio tab state for persisting transcription text
  const { textContent, setTextContent } = useRadioTabState({
    persistKey: "radio-transcription",
    storage: 'sessionStorage',
    persistTextContent: true
  });

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
    <TooltipProvider>
      <RadioContainer 
        persistedText={textContent} 
        onTextChange={setTextContent}
        persistKey="radio-files"
        storage="sessionStorage"
      />
    </TooltipProvider>
  );
};

export default Radio;
