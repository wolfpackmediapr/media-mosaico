
import { useState, useEffect } from "react";
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
  const [content, setContent] = usePersistentState<string>(
    persistKey,
    initialContent,
    { storage }
  );

  // Track if the notepad is expanded or collapsed
  const [isExpanded, setIsExpanded] = useState(true);

  // Reset function for clearing content
  const resetContent = () => {
    setContent("");
  };

  return {
    content,
    setContent,
    isExpanded,
    setIsExpanded,
    resetContent
  };
};
