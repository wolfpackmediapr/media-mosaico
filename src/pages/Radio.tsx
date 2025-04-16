
import { useRadioTabState } from "@/hooks/radio/useRadioTabState";
import RadioContainer from "@/components/radio/RadioContainer";
import { useEffect } from "react";

const Radio = () => {
  // Use radio tab state for persisting transcription text
  const { textContent, setTextContent, clearText } = useRadioTabState({
    persistKey: "radio-transcription",
    storage: 'sessionStorage',
    persistTextContent: true
  });

  // Clear text content when the component mounts (page loads/refresh)
  useEffect(() => {
    const isPageRefresh = performance.navigation?.type === 1 || 
                       document.visibilityState === 'visible';
    
    // Clear text on browser refresh
    if (isPageRefresh) {
      console.log("Page was refreshed, clearing radio text content");
      clearText();
    }
  }, [clearText]);

  return (
    <RadioContainer 
      persistedText={textContent} 
      onTextChange={setTextContent}
      persistKey="radio-files"
      storage="sessionStorage"
      shouldClearOnRefresh={true}
    />
  );
};

export default Radio;
