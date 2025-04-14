import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { useDebounce } from "@/hooks/useDebounce";

interface MediaState {
  id: string;
  type: "video" | "audio";
  currentTime: number;
  duration: number;
  volume: number;
  playbackRate: number;
  isPlaying: boolean;
  src?: string;
  fileName?: string;
}

interface MediaStateContextType {
  registerMedia: (mediaId: string, mediaType: "video" | "audio") => void;
  unregisterMedia: (mediaId: string) => void;
  updateMediaState: (id: string, state: Partial<MediaState>) => void;
  getMediaState: (id: string) => MediaState | undefined;
  clearAllMediaState: () => void;
  activeMediaId: string | null;
  setActiveMediaId: (id: string | null) => void;
}

const MediaStateContext = createContext<MediaStateContextType | undefined>(undefined);

export function useMediaState() {
  const context = useContext(MediaStateContext);
  if (!context) {
    throw new Error("useMediaState must be used within a MediaStateProvider");
  }
  return context;
}

interface MediaStateProviderProps {
  children: React.ReactNode;
}

const STORAGE_KEY = "media-state";
const DEBOUNCE_DELAY = 1000;

export function MediaStateProvider({ children }: MediaStateProviderProps) {
  const [mediaStates, setMediaStates] = useState<Record<string, MediaState>>({});
  const [activeMediaId, setActiveMediaId] = useState<string | null>(null);
  const mediaStatesRef = useRef<Record<string, MediaState>>({});
  const debouncedMediaStates = useDebounce(mediaStates, DEBOUNCE_DELAY);

  // Load media states from sessionStorage on mount
  useEffect(() => {
    try {
      const storedStates = sessionStorage.getItem(STORAGE_KEY);
      if (storedStates) {
        const parsedStates = JSON.parse(storedStates);
        setMediaStates(parsedStates);
        mediaStatesRef.current = parsedStates;
      }
    } catch (error) {
      console.error("Error loading media states from sessionStorage:", error);
    }
  }, []);

  // Save media states to sessionStorage when they change (debounced)
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(debouncedMediaStates));
    } catch (error) {
      console.error("Error saving media states to sessionStorage:", error);
    }
  }, [debouncedMediaStates]);

  // Handle visibility change to save state when user leaves the page
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        try {
          // Use the ref to get the most up-to-date state
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify(mediaStatesRef.current));
        } catch (error) {
          console.error("Error saving media states on visibility change:", error);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const registerMedia = (mediaId: string, mediaType: "video" | "audio") => {
    setMediaStates(prevStates => {
      // If this media already exists in our state, use it
      if (prevStates[mediaId]) {
        return prevStates;
      }

      // Otherwise create a new entry
      const newState = {
        ...prevStates,
        [mediaId]: {
          id: mediaId,
          type: mediaType,
          currentTime: 0,
          duration: 0,
          volume: mediaType === "video" ? 50 : 50, // Default volumes
          playbackRate: 1,
          isPlaying: false,
        }
      };
      mediaStatesRef.current = newState;
      return newState;
    });
  };

  const unregisterMedia = (mediaId: string) => {
    setMediaStates(prevStates => {
      const newStates = { ...prevStates };
      delete newStates[mediaId];
      mediaStatesRef.current = newStates;
      return newStates;
    });
  };

  const updateMediaState = (id: string, state: Partial<MediaState>) => {
    setMediaStates(prevStates => {
      if (!prevStates[id]) return prevStates;

      const newState = {
        ...prevStates,
        [id]: {
          ...prevStates[id],
          ...state
        }
      };
      mediaStatesRef.current = newState;
      return newState;
    });
  };

  const getMediaState = (id: string) => {
    return mediaStates[id];
  };

  const clearAllMediaState = () => {
    setMediaStates({});
    mediaStatesRef.current = {};
    sessionStorage.removeItem(STORAGE_KEY);
  };

  const value = {
    registerMedia,
    unregisterMedia,
    updateMediaState,
    getMediaState,
    clearAllMediaState,
    activeMediaId,
    setActiveMediaId
  };

  return (
    <MediaStateContext.Provider value={value}>
      {children}
    </MediaStateContext.Provider>
  );
}
