
import { Textarea } from "@/components/ui/textarea";
import { useRef, useEffect, useCallback } from "react";
import { useDebounce } from "@/hooks/useDebounce";

interface TranscriptionTextAreaProps {
  text: string;
  isProcessing: boolean;
  isEditing: boolean;
  onChange: (text: string) => void;
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
  
  // Track if we're in the middle of a user-initiated edit
  const isUserEditingRef = useRef(false);

  // Save cursor position before re-render and pass the value to parent
  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (textareaRef.current) {
      isUserEditingRef.current = true;
      cursorPositionRef.current = {
        start: textareaRef.current.selectionStart,
        end: textareaRef.current.selectionEnd
      };
    }
    // Extract string value and pass to the parent
    onChange(e.target.value);
  }, [onChange]);

  // Restore cursor position after text value is updated, using requestAnimationFrame for better timing
  useEffect(() => {
    if (!isEditing || !textareaRef.current || !cursorPositionRef.current || !isUserEditingRef.current) return;
    
    const { start, end } = cursorPositionRef.current;
    
    // Only restore if cursor positions are within bounds of the new text
    const maxLength = textareaRef.current.value.length;
    const safeStart = Math.min(start, maxLength);
    const safeEnd = Math.min(end, maxLength);
    
    // Use requestAnimationFrame to ensure DOM has updated
    const rafId = requestAnimationFrame(() => {
      if (textareaRef.current && document.activeElement === textareaRef.current) {
        textareaRef.current.setSelectionRange(safeStart, safeEnd);
      }
    });
    
    // Reset user editing flag after cursor position is restored
    const timeoutId = setTimeout(() => {
      isUserEditingRef.current = false;
    }, 100);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timeoutId);
    };
  }, [text, isEditing]);

  // Focus the textarea when entering edit mode
  useEffect(() => {
    if (isEditing && !isProcessing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing, isProcessing]);

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
