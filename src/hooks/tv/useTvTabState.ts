
import { useState, useEffect } from "react";
import { usePersistentState } from "@/hooks/use-persistent-state";

interface UseTvTabStateOptions {
  defaultTab?: string;
  persistKey?: string;
  storage?: 'localStorage' | 'sessionStorage';
}

/**
 * A hook that manages TV tab state with persistence
 * It will persist the active tab between navigation and page reloads
 */
export const useTvTabState = (options: UseTvTabStateOptions = {}) => {
  const {
    defaultTab = "noticias",
    persistKey = "tv-active-tab",
    storage = "sessionStorage"
  } = options;

  // Use persistent state to store the active tab
  const [activeTab, setActiveTab] = usePersistentState<string>(
    persistKey,
    defaultTab,
    { storage }
  );

  // Public API for the hook
  return {
    activeTab,
    setActiveTab,
    resetTab: () => setActiveTab(defaultTab)
  };
};
