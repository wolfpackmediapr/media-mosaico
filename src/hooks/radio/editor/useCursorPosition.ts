
import { useTextAreaCursor } from './useTextAreaCursor';

interface UseCursorPositionOptions {
  isEnabled: boolean;
  text: string;
}

/**
 * A hook that tracks and restores cursor position in text inputs
 * to prevent cursor jumping when the component re-renders.
 * @deprecated Consider using the more specific useTextAreaCursor hook instead
 */
export const useCursorPosition = ({ isEnabled, text }: UseCursorPositionOptions) => {
  const { textAreaRef, handleTextChange } = useTextAreaCursor({
    isEnabled,
    text
  });
  
  return {
    inputRef: textAreaRef,
    handleInputChange: handleTextChange
  };
};
