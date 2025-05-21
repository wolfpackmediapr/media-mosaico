
import { useState, useCallback } from 'react';

interface UseEditorStateOptions {
  initialText: string;
  onTextChange: (text: string) => void;
}

/**
 * Hook to manage editor state with undo/redo capabilities
 */
export const useEditorState = ({ initialText, onTextChange }: UseEditorStateOptions) => {
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [localText, setLocalText] = useState<string>(initialText || '');
  
  // Update local text when initial text changes
  const updateLocalText = useCallback((newText: string) => {
    setLocalText(newText);
    onTextChange(newText);
  }, [onTextChange]);
  
  // Toggle edit mode
  const toggleEditMode = useCallback(() => {
    setIsEditMode(prev => !prev);
  }, []);
  
  // Handle text input changes
  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setLocalText(newText);
    onTextChange(newText);
  }, [onTextChange]);

  return {
    isEditMode,
    localText,
    setEditMode: setIsEditMode,
    toggleEditMode,
    updateLocalText,
    handleTextChange
  };
};
