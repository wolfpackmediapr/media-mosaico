
import { useState, useEffect } from "react";
import { useMediaPersistence } from "@/context/MediaPersistenceContext";
import { usePersistentState } from "@/hooks/use-persistent-state";

interface UploadedFile extends File {
  preview?: string;
}

export const usePersistentVideoState = () => {
  const { activeMediaRoute, setActiveMediaRoute, isMediaPlaying, setIsMediaPlaying } = useMediaPersistence();
  
  // File management state
  const [uploadedFiles, setUploadedFiles] = usePersistentState<UploadedFile[]>(
    "tv-uploaded-files",
    [],
    { storage: 'sessionStorage' }
  );
  
  // Video controls state
  const [volume, setVolume] = usePersistentState<number[]>(
    "tv-volume",
    [50],
    { storage: 'sessionStorage' }
  );
  
  const [currentTime, setCurrentTime] = useState(0);
  const [currentVideoPath, setCurrentVideoPath] = useState<string>();
  
  // Register this component as the active media route
  useEffect(() => {
    setActiveMediaRoute('/tv');
    
    // Cleanup when unmounting
    return () => {
      // Only clear if we're the active route
      if (activeMediaRoute === '/tv') {
        // We don't clear the active route here
      }
    };
  }, []);

  const onTogglePlayback = () => {
    setIsMediaPlaying(!isMediaPlaying);
  };

  const onVolumeChange = (value: number[]) => {
    setVolume(value);
  };

  const onPlayPause = () => {
    setIsMediaPlaying(!isMediaPlaying);
  };

  const onSeekToTimestamp = (timestamp: number) => {
    setCurrentTime(timestamp);
  };

  return {
    uploadedFiles,
    setUploadedFiles,
    isPlaying: isMediaPlaying,
    volume,
    currentVideoPath,
    currentTime,
    onTogglePlayback,
    onVolumeChange,
    onPlayPause,
    onSeekToTimestamp,
    isActiveMediaRoute: activeMediaRoute === '/tv',
    setIsMediaPlaying
  };
};
