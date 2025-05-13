
import { useState, useEffect } from "react";
import { usePersistentState } from "@/hooks/use-persistent-state";

interface UseNotepadStateOptions {
  persistKey?: string;
  storage?: 'localStorage' | 'sessionStorage';
}

export const useNotepadState = ({
  persistKey = "radio-notepad",
  storage = 'sessionStorage'
}: UseNotepadStateOptions = {}) => {
  const [content, setContent, removeContent] = usePersistentState<string>(
    persistKey,
    "",
    { storage }
  );

  const [isExpanded, setIsExpanded, removeIsExpanded] = usePersistentState<boolean>(
    `${persistKey}-expanded`,
    false,
    { storage }
  );

  // Reset content function
  const resetContent = () => {
    removeContent();
    setContent("");
  };

  // Initialize on mount with default empty state if needed
  useEffect(() => {
    if (content === undefined) {
      setContent("");
    }
  }, [content, setContent]);

  return {
    content,
    setContent,
    isExpanded,
    setIsExpanded,
    resetContent
  };
};
