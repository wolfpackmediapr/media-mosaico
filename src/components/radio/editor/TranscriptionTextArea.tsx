
import { Textarea } from "@/components/ui/textarea";
import { useRef, useEffect } from "react";

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const cursorPositionRef = useRef<{ start: number; end: number } | null>(null);

  // Save cursor position before re-render
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (textareaRef.current) {
      cursorPositionRef.current = {
        start: textareaRef.current.selectionStart,
        end: textareaRef.current.selectionEnd
      };
    }
    onChange(e);
  };

  // Restore cursor position after text value is updated
  useEffect(() => {
    if (textareaRef.current && cursorPositionRef.current && isEditing) {
      const { start, end } = cursorPositionRef.current;
      
      // Only restore if cursor positions are within bounds of the new text
      const maxLength = textareaRef.current.value.length;
      const safeStart = Math.min(start, maxLength);
      const safeEnd = Math.min(end, maxLength);
      
      // Use setTimeout to ensure DOM has updated
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.setSelectionRange(safeStart, safeEnd);
          textareaRef.current.focus();
        }
      }, 0);
    }
  }, [text, isEditing]);

  return (
    <Textarea
      ref={textareaRef}
      placeholder="Aquí aparecerá el texto transcrito..."
      className={`min-h-[200px] resize-y pr-12 ${isEditing ? 'border-primary' : ''} focus:border-primary focus-visible:ring-1`}
      value={text}
      onChange={handleTextChange}
      readOnly={isProcessing || !isEditing}
      onClick={onClick}
    />
  );
};

export default TranscriptionTextArea;
