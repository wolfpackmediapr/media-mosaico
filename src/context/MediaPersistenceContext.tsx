
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useLocation } from "react-router-dom";

interface MediaPersistenceContextType {
  activeMediaRoute: string | null;
  setActiveMediaRoute: (route: string | null) => void;
  isMediaPlaying: boolean;
  setIsMediaPlaying: (isPlaying: boolean) => void;
  lastActiveRoute: string | null;
  lastPlaybackPosition: { [fileId: string]: number };
  setLastPlaybackPosition: (positions: { [fileId: string]: number }) => void;
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

  const [lastPlaybackPosition, setLastPlaybackPosition] = useState<{ [fileId: string]: number }>(() => {
    const saved = sessionStorage.getItem('media-playback-positions');
    return saved ? JSON.parse(saved) : {};
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

  // Persist playback positions to session storage
  useEffect(() => {
    if (Object.keys(lastPlaybackPosition).length > 0) {
      sessionStorage.setItem('media-playback-positions', JSON.stringify(lastPlaybackPosition));
    }
  }, [lastPlaybackPosition]);
  
  // Handle page visibility changes to help maintain audio state
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && activeMediaRoute) {
        console.log("[MediaPersistenceContext] Tab visible again, active route:", activeMediaRoute);
      }
    };
    
    // Handle page unload to save state
    const handleBeforeUnload = () => {
      // Ensure latest state is persisted
      sessionStorage.setItem('media-playing', isMediaPlaying.toString());
      sessionStorage.setItem('media-playback-positions', JSON.stringify(lastPlaybackPosition));
    };
    
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);
    
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [activeMediaRoute, isMediaPlaying, lastPlaybackPosition]);

  return (
    <MediaPersistenceContext.Provider
      value={{
        activeMediaRoute,
        setActiveMediaRoute,
        isMediaPlaying,
        setIsMediaPlaying,
        lastActiveRoute,
        lastPlaybackPosition,
        setLastPlaybackPosition
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
