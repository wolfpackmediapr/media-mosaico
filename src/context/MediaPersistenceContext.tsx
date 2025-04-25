
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useLocation } from "react-router-dom";

interface MediaPersistenceContextType {
  activeMediaRoute: string | null;
  setActiveMediaRoute: (route: string | null) => void;
  isMediaPlaying: boolean;
  setIsMediaPlaying: (isPlaying: boolean) => void;
  lastActiveRoute: string | null;
}

const MediaPersistenceContext = createContext<MediaPersistenceContextType | undefined>(undefined);

export function MediaPersistenceProvider({ children }: { children: ReactNode }) {
  const [activeMediaRoute, setActiveMediaRoute] = useState<string | null>(null);
  const [isMediaPlaying, setIsMediaPlaying] = useState(false);
  const [lastActiveRoute, setLastActiveRoute] = useState<string | null>(null);
  const location = useLocation();

  // Track route changes to save last active media route
  useEffect(() => {
    // Store the current route as last active when it contains media
    if (location.pathname === "/radio" || location.pathname === "/tv") {
      setLastActiveRoute(location.pathname);
      // When navigating to a media route, update active route
      setActiveMediaRoute(location.pathname);
    }
  }, [location]);

  return (
    <MediaPersistenceContext.Provider
      value={{
        activeMediaRoute,
        setActiveMediaRoute,
        isMediaPlaying,
        setIsMediaPlaying,
        lastActiveRoute
      }}
    >
      {children}
    </MediaPersistenceContext.Provider>
  );
}

export const useMediaPersistence = () => {
  const context = useContext(MediaPersistenceContext);
  if (!context) {
    throw new Error("useMediaPersistence must be used within a MediaPersistenceProvider");
  }
  return context;
};
