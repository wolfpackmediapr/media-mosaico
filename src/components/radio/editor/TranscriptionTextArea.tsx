
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useRef } from "react";

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
  // Create ref to access textarea DOM element
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  
  // Use ref to track cursor position to avoid re-renders
  const cursorPositionRef = useRef<{ start: number; end: number } | null>(null);
  
  // Handle text changes while preserving cursor position
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (isEditing) {
      // Store current cursor position before the state update
      cursorPositionRef.current = {
        start: e.target.selectionStart || 0,
        end: e.target.selectionEnd || 0
      };
    }
    
    // Call the original onChange handler from props
    onChange(e);
  };
  
  // Restore cursor position after component updates
  useEffect(() => {
    // Only restore cursor if we're in editing mode and have a position to restore
    if (isEditing && textareaRef.current && cursorPositionRef.current) {
      const { start, end } = cursorPositionRef.current;
      
      // Ensure positions are within valid range for current text length
      const maxLength = textareaRef.current.value.length;
      const safeStart = Math.min(start, maxLength);
      const safeEnd = Math.min(end, maxLength);
      
      // Set cursor position or selection range
      try {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(safeStart, safeEnd);
      } catch (err) {
        console.warn("Failed to restore cursor position:", err);
      }
    }
  }, [text, isEditing]);
  
  return (
    <Textarea
      ref={textareaRef}
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
