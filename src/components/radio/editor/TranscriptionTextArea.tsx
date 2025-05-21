
import React from "react";
import { Textarea } from "@/components/ui/textarea";
import { useTextAreaCursor } from "@/hooks/radio/editor/useTextAreaCursor";

interface TranscriptionTextAreaProps {
  text: string;
  isProcessing: boolean;
  isEditing: boolean;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onClick?: () => void;
  className?: string;
  placeholder?: string;
}

const TranscriptionTextArea = ({
  text,
  isProcessing,
  isEditing,
  onChange,
  onClick,
  className = "min-h-[200px] resize-y pr-12",
  placeholder = "Aquí aparecerá el texto transcrito..."
}: TranscriptionTextAreaProps) => {
  // Use the specialized cursor position hook
  const { textAreaRef, handleTextChange } = useTextAreaCursor({
    isEnabled: isEditing,
    text
  });
  
  // Handle text changes while preserving cursor position
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    // Process cursor tracking with our hook
    const processedEvent = handleTextChange(e);
    
    // Call the original onChange handler from props
    onChange(processedEvent);
  };
  
  const combinedClassName = `${className} ${isEditing ? 'border-primary' : ''} focus:border-primary focus-visible:ring-1`;
  
  return (
    <Textarea
      ref={textAreaRef}
      placeholder={placeholder}
      className={combinedClassName}
      value={text}
      onChange={handleChange}
      readOnly={isProcessing || !isEditing}
      onClick={onClick}
    />
  );
};

export default TranscriptionTextArea;
