
import { useEffect, useRef, useState } from "react";
import { useMediaState } from "@/context/MediaStateContext";

interface UseMediaStatePersistenceOptions {
  mediaType: "video" | "audio";
  initialVolume?: number;
  initialPlaybackRate?: number;
  onTimeRestored?: (time: number) => void;
  src?: string;
  fileName?: string;
}

export function useMediaStatePersistence(
  mediaId: string, 
  options: UseMediaStatePersistenceOptions
) {
  const { 
    registerMedia, 
    unregisterMedia, 
    updateMediaState, 
    getMediaState,
    activeMediaId,
    setActiveMediaId
  } = useMediaState();
  
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const mediaElementRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);
  
  // Register this media element when the component mounts
  useEffect(() => {
    registerMedia(mediaId, options.mediaType);
    
    return () => {
      unregisterMedia(mediaId);
    };
  }, [mediaId, options.mediaType]);
  
  // Update source info when available
  useEffect(() => {
    if (options.src || options.fileName) {
      updateMediaState(mediaId, {
        src: options.src,
        fileName: options.fileName
      });
    }
  }, [options.src, options.fileName]);
  
  // Handle first load restoration of state
  useEffect(() => {
    if (isFirstLoad) {
      const savedState = getMediaState(mediaId);
      if (savedState) {
        // Only restore relevant parts of state when needed
        if (options.onTimeRestored && savedState.currentTime > 0) {
          options.onTimeRestored(savedState.currentTime);
        }
      }
      setIsFirstLoad(false);
    }
  }, [isFirstLoad, mediaId]);
  
  const updateTime = (currentTime: number, duration: number) => {
    updateMediaState(mediaId, { currentTime, duration });
  };
  
  const updateVolume = (volume: number) => {
    updateMediaState(mediaId, { volume });
  };
  
  const updatePlaybackRate = (playbackRate: number) => {
    updateMediaState(mediaId, { playbackRate });
  };
  
  const updatePlayingState = (isPlaying: boolean) => {
    updateMediaState(mediaId, { isPlaying });
    if (isPlaying) {
      setActiveMediaId(mediaId);
    } else if (activeMediaId === mediaId) {
      setActiveMediaId(null);
    }
  };
  
  const setMediaElement = (element: HTMLVideoElement | HTMLAudioElement | null) => {
    mediaElementRef.current = element;
  };
  
  return {
    updateTime,
    updateVolume,
    updatePlaybackRate,
    updatePlayingState,
    setMediaElement,
    isActiveMedia: activeMediaId === mediaId
  };
}
