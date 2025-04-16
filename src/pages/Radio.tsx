
import { useRadioTabState } from "@/hooks/radio/useRadioTabState";
import RadioContainer from "@/components/radio/RadioContainer";

const Radio = () => {
  // Use radio tab state for persisting transcription text
  const { textContent, setTextContent } = useRadioTabState({
    persistKey: "radio-transcription",
    storage: 'sessionStorage',
    persistTextContent: true
  });

  return (
    <RadioContainer 
      persistedText={textContent} 
      onTextChange={setTextContent}
    />
  );
};

export default Radio;
