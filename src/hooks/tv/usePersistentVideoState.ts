
import { useState, useEffect, useRef } from "react";
import { useMediaPersistence } from "@/context/MediaPersistenceContext";
import { usePersistentState } from "@/hooks/use-persistent-state";
import { useVideoVisibilitySync } from "./processing/useVideoVisibilitySync";

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
  
  // File management state with proper serialization
  const [uploadedFiles, setUploadedFiles] = usePersistentState<UploadedFile[]>(
    "tv-uploaded-files",
    [],
    { 
      storage: 'sessionStorage',
      serialize: (files) => {
        // Strip blob URLs but keep filePath and metadata
        const sanitized = files.map(f => ({
          name: f.name,
          size: f.size,
          type: f.type,
          lastModified: f.lastModified,
          preview: f.preview?.startsWith('blob:') ? undefined : f.preview,
          filePath: f.filePath
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
          return Object.assign(file, {
            preview: fileData.preview,
            filePath: fileData.filePath
          }) as UploadedFile;
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
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Auto-resume functionality
  const hasAttemptedAutoResume = useRef(false);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);

  // Trigger functions for visibility sync
  const triggerPlay = () => {
    setIsMediaPlaying(true);
    console.log('[usePersistentVideoState] triggerPlay called');
  };

  const triggerPause = () => {
    setIsMediaPlaying(false);
    console.log('[usePersistentVideoState] triggerPause called');
  };

  // Integrate video visibility sync for browser tab switching
  useVideoVisibilitySync({
    isPlaying: isMediaPlaying,
    isLoading,
    isReady,
    currentVideoPath,
    videoElementRef,
    triggerPlay,
    triggerPause,
  });

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
    console.log('[usePersistentVideoState] registerVideoElement called', {
      hasElement: !!element,
      readyState: element?.readyState,
      currentFileId
    });
    
    videoElementRef.current = element;
    
    if (element && currentFileId) {
      // Set up time update listener to track position
      const handleTimeUpdate = () => {
        setCurrentTime(element.currentTime);
      };

      // Track loading and ready states
      const handleLoadStart = () => {
        setIsLoading(true);
        setIsReady(false);
        console.log('[usePersistentVideoState] Video loading started');
      };

      const handleCanPlay = () => {
        setIsLoading(false);
        setIsReady(true);
        console.log('[usePersistentVideoState] Video ready to play, readyState:', element.readyState);
      };

      const handleError = () => {
        setIsLoading(false);
        setIsReady(false);
        console.error('[usePersistentVideoState] Video error');
      };
      
      element.addEventListener('timeupdate', handleTimeUpdate);
      element.addEventListener('loadstart', handleLoadStart);
      element.addEventListener('canplay', handleCanPlay);
      element.addEventListener('error', handleError);
      
      return () => {
        element.removeEventListener('timeupdate', handleTimeUpdate);
        element.removeEventListener('loadstart', handleLoadStart);
        element.removeEventListener('canplay', handleCanPlay);
        element.removeEventListener('error', handleError);
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
    isReady,
    isLoading,
    videoElementRef,
    onTogglePlayback,
    onVolumeChange,
    onPlayPause,
    onSeekToTimestamp,
    registerVideoElement,
    isActiveMediaRoute: activeMediaRoute === '/tv',
    setIsMediaPlaying,
    setCurrentVideoPath,
    triggerPlay,
    triggerPause
  };
};
