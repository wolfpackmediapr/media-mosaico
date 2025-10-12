
import { useState, useEffect, useRef } from "react";
import { useMediaPersistence } from "@/context/MediaPersistenceContext";
import { usePersistentState } from "@/hooks/use-persistent-state";

interface UploadedFile extends File {
  preview?: string;
  filePath?: string;
}

export const usePersistentVideoState = () => {
  const { 
    activeMediaRoute, 
    setActiveMediaRoute, 
    isMediaPlaying, 
    setIsMediaPlaying,
    updatePlaybackPosition,
    lastPlaybackPosition 
  } = useMediaPersistence();
  
  // File management state
  const [uploadedFiles, setUploadedFiles] = usePersistentState<UploadedFile[]>(
    "tv-uploaded-files",
    [],
    { 
      storage: 'sessionStorage',
      serialize: (files) => {
        // Preserve file metadata and filePath, but remove blob URLs
        const sanitized = files.map(f => ({
          name: f.name,
          size: f.size,
          type: f.type,
          lastModified: f.lastModified,
          preview: f.preview?.startsWith('blob:') ? undefined : f.preview,
          filePath: f.filePath // Preserve Supabase storage path
        }));
        return JSON.stringify(sanitized);
      },
      deserialize: (str) => {
        const parsed = JSON.parse(str);
        // Reconstruct file-like objects with preserved metadata
        return parsed.map((fileData: any) => {
          const file = new File([], fileData.name, {
            type: fileData.type,
            lastModified: fileData.lastModified
          });
          // Assign additional properties
          return Object.assign(file, {
            preview: fileData.preview,
            filePath: fileData.filePath
          });
        });
      }
    }
  );
  
  // Video controls state
  const [volume, setVolume] = usePersistentState<number[]>(
    "tv-volume",
    [50],
    { storage: 'sessionStorage' }
  );
  
  const [currentTime, setCurrentTime] = useState(0);
  const [currentVideoPath, setCurrentVideoPath] = useState<string>();
  const [currentFileId, setCurrentFileId] = useState<string>();
  
  // Auto-resume functionality
  const hasAttemptedAutoResume = useRef(false);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);

  // Register this component as the active media route
  useEffect(() => {
    setActiveMediaRoute('/tv');
    console.log('[usePersistentVideoState] TV route activated');
    
    // Cleanup when unmounting
    return () => {
      if (activeMediaRoute === '/tv') {
        console.log('[usePersistentVideoState] TV route deactivated');
      }
    };
  }, [setActiveMediaRoute]);

  // Auto-resume video when returning to this route
  useEffect(() => {
    if (activeMediaRoute === '/tv' && !hasAttemptedAutoResume.current && currentFileId) {
      const savedPosition = lastPlaybackPosition[currentFileId];
      
      if (savedPosition && savedPosition > 0) {
        console.log(`[usePersistentVideoState] Auto-resuming video at ${savedPosition}s for file ${currentFileId}`);
        setCurrentTime(savedPosition);
        hasAttemptedAutoResume.current = true;
      }
    }
  }, [activeMediaRoute, currentFileId, lastPlaybackPosition]);

  // Handle visibility changes to maintain playback state
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (activeMediaRoute === '/tv') {
        if (document.hidden) {
          console.log('[usePersistentVideoState] Tab hidden - video can continue playing in background');
          // Save current position when tab becomes hidden
          if (currentFileId && currentTime > 0) {
            updatePlaybackPosition(currentFileId, currentTime);
          }
        } else {
          console.log('[usePersistentVideoState] Tab visible - resuming TV video state');
          // Restore playback state when tab becomes visible
          if (isMediaPlaying && videoElementRef.current) {
            // Video should continue playing seamlessly
            console.log('[usePersistentVideoState] Maintaining video playback state');
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [activeMediaRoute, isMediaPlaying, currentFileId, currentTime, updatePlaybackPosition]);

  // Media Session API integration for better browser media controls
  useEffect(() => {
    if (activeMediaRoute === '/tv' && 'mediaSession' in navigator) {
      navigator.mediaSession.playbackState = isMediaPlaying ? 'playing' : 'paused';
      
      // Set up media session metadata if we have a current video
      if (currentVideoPath) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: 'TV Video Analysis',
          artist: 'Medios Monitoring',
          artwork: [
            { src: '/favicon.ico', sizes: '32x32', type: 'image/x-icon' }
          ]
        });
      }

      // Set up media session action handlers
      navigator.mediaSession.setActionHandler('play', () => {
        setIsMediaPlaying(true);
      });

      navigator.mediaSession.setActionHandler('pause', () => {
        setIsMediaPlaying(false);
      });

      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) {
          setCurrentTime(details.seekTime);
        }
      });
    }
  }, [activeMediaRoute, isMediaPlaying, currentVideoPath, setIsMediaPlaying]);

  // Save playback position periodically
  useEffect(() => {
    if (currentFileId && currentTime > 0 && activeMediaRoute === '/tv') {
      const interval = setInterval(() => {
        if (isMediaPlaying) {
          updatePlaybackPosition(currentFileId, currentTime);
        }
      }, 5000); // Save every 5 seconds during playback

      return () => clearInterval(interval);
    }
  }, [currentFileId, currentTime, isMediaPlaying, activeMediaRoute, updatePlaybackPosition]);

  const onTogglePlayback = () => {
    setIsMediaPlaying(!isMediaPlaying);
    console.log(`[usePersistentVideoState] Video playback toggled: ${!isMediaPlaying}`);
  };

  const onVolumeChange = (value: number[]) => {
    setVolume(value);
  };

  const onPlayPause = () => {
    setIsMediaPlaying(!isMediaPlaying);
    console.log(`[usePersistentVideoState] Video play/pause: ${!isMediaPlaying}`);
  };

  const onSeekToTimestamp = (timestamp: number) => {
    setCurrentTime(timestamp);
    
    // Save the new position immediately when seeking
    if (currentFileId) {
      updatePlaybackPosition(currentFileId, timestamp);
    }
    
    console.log(`[usePersistentVideoState] Seeked to: ${timestamp}s`);
  };

  // Set current file ID when files change
  useEffect(() => {
    if (uploadedFiles.length > 0 && !currentFileId) {
      const fileId = `tv-${uploadedFiles[0].name}-${uploadedFiles[0].size}`;
      setCurrentFileId(fileId);
      console.log(`[usePersistentVideoState] Set current file ID: ${fileId}`);
    }
  }, [uploadedFiles, currentFileId]);

  // Register video element reference for direct control
  const registerVideoElement = (element: HTMLVideoElement | null) => {
    videoElementRef.current = element;
    
    if (element && currentFileId) {
      // Set up time update listener to track position
      const handleTimeUpdate = () => {
        setCurrentTime(element.currentTime);
      };
      
      element.addEventListener('timeupdate', handleTimeUpdate);
      
      return () => {
        element.removeEventListener('timeupdate', handleTimeUpdate);
      };
    }
  };

  return {
    uploadedFiles,
    setUploadedFiles,
    isPlaying: isMediaPlaying,
    volume,
    currentVideoPath,
    currentTime,
    currentFileId,
    onTogglePlayback,
    onVolumeChange,
    onPlayPause,
    onSeekToTimestamp,
    registerVideoElement,
    isActiveMediaRoute: activeMediaRoute === '/tv',
    setIsMediaPlaying,
    setCurrentVideoPath
  };
};
