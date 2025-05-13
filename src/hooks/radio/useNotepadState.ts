
import { useState, useEffect, useCallback } from "react";
import { usePersistentState } from "@/hooks/use-persistent-state";

interface UseNotepadStateProps {
  persistKey?: string;
  storage?: 'localStorage' | 'sessionStorage';
  initialContent?: string;
}

export const useNotepadState = ({
  persistKey = "radio-notepad-content",
  storage = "sessionStorage",
  initialContent = ""
}: UseNotepadStateProps = {}) => {
  // Use persistent state to store content
  const [content, setContent, removeContent] = usePersistentState<string>(
    persistKey,
    initialContent,
    { storage }
  );

  // Track if the notepad is expanded or collapsed
  const [isExpanded, setIsExpanded] = useState(true);

  // Reset function for clearing content
  const resetContent = useCallback(() => {
    setContent("");
    // Also try to manually remove from storage as a safeguard
    try {
      if (storage === 'localStorage') {
        localStorage.removeItem(persistKey);
      } else {
        sessionStorage.removeItem(persistKey);
      }
    } catch (err) {
      console.error("Error removing notepad content from storage:", err);
    }
  }, [persistKey, setContent, storage]);

  // Toggle expanded state with callback
  const toggleExpanded = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  return {
    content,
    setContent,
    isExpanded,
    setIsExpanded,
    toggleExpanded,
    resetContent,
    removeContent
  };
};
