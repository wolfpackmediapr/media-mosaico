
import { useState, useEffect } from "react";
import { usePersistentState } from "@/hooks/use-persistent-state";

interface UseTvTabStateOptions {
  defaultTab?: string;
  persistKey?: string;
  storage?: 'localStorage' | 'sessionStorage';
  persistTextContent?: boolean;
}

/**
 * A hook that manages TV tab state with persistence
 * It will persist the active tab between navigation and page reloads
 */
export const useTvTabState = (options: UseTvTabStateOptions = {}) => {
  const {
    defaultTab = "noticias",
    persistKey = "tv-active-tab",
    storage = "sessionStorage",
    persistTextContent = false
  } = options;

  // Use persistent state to store the active tab
  const [activeTab, setActiveTab] = usePersistentState<string>(
    persistKey,
    defaultTab,
    { storage }
  );

  // Add text content persistence
  const [textContent, setTextContent] = usePersistentState<string>(
    `${persistKey}-text-content`,
    "",
    { storage }
  );

  // Public API for the hook
  return {
    activeTab,
    setActiveTab,
    textContent,
    setTextContent,
    resetTab: () => setActiveTab(defaultTab)
  };
};
