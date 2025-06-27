
import { useState, useEffect } from "react";
import { usePersistentState } from "@/hooks/use-persistent-state";

interface UseTvNotepadStateOptions {
  persistKey?: string;
  storage?: 'localStorage' | 'sessionStorage';
}

export const useTvNotepadState = ({
  persistKey = "tv-notepad",
  storage = 'sessionStorage'
}: UseTvNotepadStateOptions = {}) => {
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
    notepadContent: content, // Match expected property name
    setNotepadContent: setContent, // Match expected property name
    content,
    setContent,
    isExpanded,
    setIsExpanded,
    resetContent
  };
};
