
import { useRadioTabState } from "@/hooks/radio/useRadioTabState";
import RadioContainer from "@/components/radio/RadioContainer";
import { TooltipProvider } from "@/components/ui/tooltip";

const Radio = () => {
  // Use radio tab state for persisting transcription text
  const { textContent, setTextContent } = useRadioTabState({
    persistKey: "radio-transcription",
    storage: 'sessionStorage',
    persistTextContent: true
  });

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
