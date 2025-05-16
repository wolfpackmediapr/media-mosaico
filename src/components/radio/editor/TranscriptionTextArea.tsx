
import { Textarea } from "@/components/ui/textarea";
import { useCursorPosition } from "@/hooks/radio/editor/useCursorPosition";

interface TranscriptionTextAreaProps {
  text: string;
  isProcessing: boolean;
  isEditing: boolean;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onClick?: () => void;
}

const TranscriptionTextArea = ({
  text,
  isProcessing,
  isEditing,
  onChange,
  onClick,
}: TranscriptionTextAreaProps) => {
  // Use the extracted cursor position hook
  const { inputRef, handleInputChange } = useCursorPosition({
    isEnabled: isEditing,
    text
  });
  
  // Handle text changes while preserving cursor position
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    // Process cursor tracking with our hook
    const processedEvent = handleInputChange(e);
    
    // Call the original onChange handler from props
    onChange(processedEvent);
  };
  
  return (
    <Textarea
      ref={inputRef}
      placeholder="Aquí aparecerá el texto transcrito..."
      className={`min-h-[200px] resize-y pr-12 ${isEditing ? 'border-primary' : ''} focus:border-primary focus-visible:ring-1`}
      value={text}
      onChange={handleChange}
      readOnly={isProcessing || !isEditing}
      onClick={onClick}
    />
  );
};

export default TranscriptionTextArea;
