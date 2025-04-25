import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { debounce } from 'lodash';

interface MediaPersistenceContextType {
  activeMediaRoute: string | null;
  setActiveMediaRoute: (route: string | null) => void;
  isMediaPlaying: boolean;
  setIsMediaPlaying: (isPlaying: boolean) => void;
  lastActiveRoute: string | null;
  lastPlaybackPosition: { [fileId: string]: number };
  setLastPlaybackPosition: (positions: { [fileId: string]: number }) => void;
  updatePlaybackPosition: (fileId: string, position: number) => void;
  clearPlaybackPositions: () => void;
}

const MediaPersistenceContext = createContext<MediaPersistenceContextType | undefined>(undefined);

// Routes that should be considered media routes
const MEDIA_ROUTES = ['/radio', '/tv', '/publiteca/radio', '/publiteca/tv'];

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

  // Debounced function to save playback positions to avoid excessive writes
  const debouncedSavePositions = useCallback(
    debounce((positions: { [fileId: string]: number }) => {
      try {
        sessionStorage.setItem('media-playback-positions', JSON.stringify(positions));
        console.log("[MediaPersistenceContext] Saved playback positions", 
          Object.keys(positions).length > 0 ? `for ${Object.keys(positions).length} files` : "(empty)");
      } catch (error) {
        console.error("[MediaPersistenceContext] Error saving playback positions:", error);
        // In case of quota exceeded, try to clear old entries
        if (error instanceof DOMException && error.name === 'QuotaExceededError') {
          // Keep only the 10 most recent positions
          const recent = Object.entries(positions)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
          
          try {
            sessionStorage.setItem('media-playback-positions', JSON.stringify(recent));
            console.log("[MediaPersistenceContext] Saved reduced playback positions");
            setLastPlaybackPosition(recent);
          } catch (innerError) {
            console.error("[MediaPersistenceContext] Failed to save reduced positions:", innerError);
          }
        }
      }
    }, 1000),
    []
  );

  // Function to update a single position
  const updatePlaybackPosition = useCallback((fileId: string, position: number) => {
    setLastPlaybackPosition(prev => {
      const updated = { ...prev, [fileId]: position };
      debouncedSavePositions(updated);
      return updated;
    });
  }, [debouncedSavePositions]);
  
  // Clear all playback positions
  const clearPlaybackPositions = useCallback(() => {
    setLastPlaybackPosition({});
    sessionStorage.removeItem('media-playback-positions');
    console.log("[MediaPersistenceContext] Cleared all playback positions");
  }, []);

  // Track route changes to save last active media route
  useEffect(() => {
    // Check if the current route is a media route
    const isMediaRoute = MEDIA_ROUTES.includes(location.pathname);
    
    if (isMediaRoute) {
      setLastActiveRoute(location.pathname);
      sessionStorage.setItem('last-active-route', location.pathname);
      
      // When navigating to a media route, update active route
      setActiveMediaRoute(location.pathname);
      sessionStorage.setItem('active-media-route', location.pathname);
      
      console.log(`[MediaPersistenceContext] Media route activated: ${location.pathname}`);
    }
  }, [location]);
  
  // Persist media playing state to session storage
  useEffect(() => {
    sessionStorage.setItem('media-playing', isMediaPlaying.toString());
    
    // Update the media session state if available
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = isMediaPlaying ? 'playing' : 'paused';
    }
  }, [isMediaPlaying]);

  // Persist playback positions to session storage with debouncing
  useEffect(() => {
    if (Object.keys(lastPlaybackPosition).length > 0) {
      debouncedSavePositions(lastPlaybackPosition);
    }
    
    return () => {
      // Make sure to flush any pending writes when unmounting
      debouncedSavePositions.flush();
    };
  }, [lastPlaybackPosition, debouncedSavePositions]);
  
  // Handle page visibility changes to help maintain audio state
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && activeMediaRoute) {
        console.log("[MediaPersistenceContext] Tab visible again, active route:", activeMediaRoute);
        
        // When coming back from hidden state, check if we need to re-initialize media
        if (isMediaPlaying) {
          console.log("[MediaPersistenceContext] Media was playing, ensuring state is consistent");
        }
      } else if (document.hidden) {
        console.log("[MediaPersistenceContext] Tab hidden, persisting state");
        // Save current state immediately when tab is hidden
        debouncedSavePositions.flush();
      }
    };
    
    // Handle page unload to save state
    const handleBeforeUnload = () => {
      // Ensure latest state is persisted
      sessionStorage.setItem('media-playing', isMediaPlaying.toString());
      debouncedSavePositions.flush();
    };
    
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);
    
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [activeMediaRoute, isMediaPlaying, debouncedSavePositions]);

  return (
    <MediaPersistenceContext.Provider
      value={{
        activeMediaRoute,
        setActiveMediaRoute,
        isMediaPlaying,
        setIsMediaPlaying,
        lastActiveRoute,
        lastPlaybackPosition,
        setLastPlaybackPosition,
        updatePlaybackPosition,
        clearPlaybackPositions
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
