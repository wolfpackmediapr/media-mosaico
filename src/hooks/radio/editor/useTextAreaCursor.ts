
import { useRef, useEffect } from 'react';

interface UseTextAreaCursorOptions {
  isEnabled: boolean;
  text: string;
  onPositionChange?: (position: { start: number; end: number }) => void;
}

/**
 * A specialized hook for tracking and restoring cursor position in textareas
 * to prevent cursor jumping when the component re-renders.
 */
export const useTextAreaCursor = ({ isEnabled, text, onPositionChange }: UseTextAreaCursorOptions) => {
  // Reference to the DOM element
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
  
  // Store cursor position to maintain across renders
  const cursorPositionRef = useRef<{ start: number; end: number } | null>(null);
  
  // Track cursor position on text change
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (isEnabled) {
      const position = {
        start: e.target.selectionStart || 0,
        end: e.target.selectionEnd || 0
      };
      
      // Store current cursor position before the state update
      cursorPositionRef.current = position;
      
      // Notify parent if callback is provided
      if (onPositionChange) {
        onPositionChange(position);
      }
    }
    
    return e;
  };
  
  // Restore cursor position after component updates
  useEffect(() => {
    if (isEnabled && textAreaRef.current && cursorPositionRef.current) {
      const { start, end } = cursorPositionRef.current;
      
      // Ensure cursor position is within valid bounds
      const maxLength = textAreaRef.current.value.length;
      const safeStart = Math.min(start, maxLength);
      const safeEnd = Math.min(end, maxLength);
      
      // Set cursor position or selection range
      try {
        textAreaRef.current.focus();
        textAreaRef.current.setSelectionRange(safeStart, safeEnd);
      } catch (err) {
        console.warn("[useTextAreaCursor] Failed to restore cursor position:", err);
      }
    }
  }, [text, isEnabled]);
  
  return {
    textAreaRef,
    handleTextChange,
    getCurrentPosition: () => cursorPositionRef.current
  };
};
