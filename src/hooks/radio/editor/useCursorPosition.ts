
import { useRef, useEffect } from 'react';

interface UseCursorPositionOptions {
  isEnabled: boolean;
  text: string;
}

/**
 * A hook that tracks and restores cursor position in text inputs
 * to prevent cursor jumping when the component re-renders.
 */
export const useCursorPosition = ({ isEnabled, text }: UseCursorPositionOptions) => {
  // Reference to the DOM element
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);
  
  // Store cursor position to maintain across renders
  const cursorPositionRef = useRef<{ start: number; end: number } | null>(null);
  
  // Track cursor position on text change
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    if (isEnabled) {
      // Store current cursor position before the state update
      cursorPositionRef.current = {
        start: e.target.selectionStart || 0,
        end: e.target.selectionEnd || 0
      };
    }
    
    return e;
  };
  
  // Restore cursor position after component updates
  useEffect(() => {
    if (isEnabled && inputRef.current && cursorPositionRef.current) {
      const { start, end } = cursorPositionRef.current;
      
      // Ensure cursor position is within valid bounds
      const maxLength = inputRef.current.value.length;
      const safeStart = Math.min(start, maxLength);
      const safeEnd = Math.min(end, maxLength);
      
      // Set cursor position or selection range
      try {
        inputRef.current.focus();
        inputRef.current.setSelectionRange(safeStart, safeEnd);
      } catch (err) {
        console.warn("Failed to restore cursor position:", err);
      }
    }
  }, [text, isEnabled]);
  
  return {
    inputRef,
    handleInputChange: handleChange
  };
};
