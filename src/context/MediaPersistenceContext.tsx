
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
  const [activeMediaRoute, setActiveMediaRoute] = useState<string | null>(() => {
    // Restore from session storage on first load
    return sessionStorage.getItem('active-media-route');
  });
  
  const [isMediaPlaying, setIsMediaPlaying] = useState<boolean>(() => {
    // Restore playing state from session storage
    return sessionStorage.getItem('media-playing') === 'true';
  });
  
  const [lastActiveRoute, setLastActiveRoute] = useState<string | null>(() => {
    return sessionStorage.getItem('last-active-route');
  });
  
  const location = useLocation();

  // Track route changes to save last active media route
  useEffect(() => {
    // Store the current route as last active when it contains media
    if (location.pathname === "/radio" || location.pathname === "/tv") {
      setLastActiveRoute(location.pathname);
      sessionStorage.setItem('last-active-route', location.pathname);
      
      // When navigating to a media route, update active route
      setActiveMediaRoute(location.pathname);
      sessionStorage.setItem('active-media-route', location.pathname);
    }
  }, [location]);
  
  // Persist media playing state to session storage
  useEffect(() => {
    sessionStorage.setItem('media-playing', isMediaPlaying.toString());
  }, [isMediaPlaying]);
  
  // Handle page visibility changes to help maintain audio state
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && activeMediaRoute) {
        console.log("[MediaPersistenceContext] Tab visible again, active route:", activeMediaRoute);
      }
    };
    
    document.addEventListener("visibilitychange", handleVisibilityChange);
    
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [activeMediaRoute]);

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
