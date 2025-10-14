
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
  
  // Phase 1: Make currentVideoPath persistent to survive route changes
  const [currentVideoPath, setCurrentVideoPath] = usePersistentState<string | undefined>(
    "tv-current-video-path",
    undefined,
    { storage: 'sessionStorage' }
  );
  
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
    
    // Phase 3: Save state immediately on unmount/route change
    return () => {
      if (activeMediaRoute === '/tv') {
        console.log('[usePersistentVideoState] TV route deactivating - saving state');
        
        // Save current playback position immediately
        if (videoElementRef.current && currentFileId) {
          const currentPos = videoElementRef.current.currentTime;
          console.log(`[usePersistentVideoState] Saving position on unmount: ${currentPos}s`);
          updatePlaybackPosition(currentFileId, currentPos);
          
          // Save playing state for auto-resume
          sessionStorage.setItem('tv-was-playing-before-unmount', isMediaPlaying.toString());
          console.log(`[usePersistentVideoState] Saved playing state: ${isMediaPlaying}`);
        }
      }
    };
  }, [setActiveMediaRoute, activeMediaRoute, currentFileId, isMediaPlaying, updatePlaybackPosition]);

  // Phase 1: Sync currentVideoPath with uploaded files
  useEffect(() => {
    if (uploadedFiles.length > 0 && !currentVideoPath) {
      // Prioritize filePath (Supabase storage) over preview (blob URL)
      const firstFile = uploadedFiles[0];
      const videoPath = firstFile.filePath || firstFile.preview;
      if (videoPath) {
        console.log('[usePersistentVideoState] Setting currentVideoPath from uploaded file:', videoPath);
        setCurrentVideoPath(videoPath);
      }
    }
  }, [uploadedFiles, currentVideoPath, setCurrentVideoPath]);

  // Phase 3: Improved auto-resume logic with timeout and better validation
  useEffect(() => {
    if (activeMediaRoute === '/tv' && videoElementRef.current && !hasAttemptedAutoResume.current) {
      const wasPlaying = sessionStorage.getItem('tv-was-playing-before-unmount') === 'true';
      
      if (wasPlaying && currentFileId && currentVideoPath) {
        const savedPosition = lastPlaybackPosition[currentFileId];
        
        console.log('[usePersistentVideoState] Auto-resume conditions:', {
          wasPlaying,
          savedPosition,
          currentFileId,
          currentVideoPath,
          hasAttempted: hasAttemptedAutoResume.current
        });
        
        if (savedPosition && savedPosition > 0) {
          // Phase 3: Add timeout to prevent infinite retry loops
          let retryCount = 0;
          const maxRetries = 30; // 3 seconds max
          
          const attemptResume = () => {
            const video = videoElementRef.current;
            if (!video) {
              console.log('[usePersistentVideoState] Video element lost during resume attempt');
              return;
            }
            
            // Phase 3: Only attempt if readyState >= HAVE_FUTURE_DATA (3)
            if (video.readyState >= 3) {
              console.log(`[usePersistentVideoState] Auto-resuming video at ${savedPosition}s, readyState: ${video.readyState}`);
              video.currentTime = savedPosition;
              
              const playPromise = video.play();
              if (playPromise) {
                playPromise
                  .then(() => {
                    setIsMediaPlaying(true);
                    console.log('[usePersistentVideoState] Auto-resume successful');
                  })
                  .catch(err => {
                    console.error('[usePersistentVideoState] Auto-resume play failed:', err);
                    // Don't set playing state if play failed
                  });
              }
              
              hasAttemptedAutoResume.current = true;
              sessionStorage.removeItem('tv-was-playing-before-unmount');
            } else if (retryCount < maxRetries) {
              retryCount++;
              console.log(`[usePersistentVideoState] Video not ready yet (readyState: ${video.readyState}), retry ${retryCount}/${maxRetries}...`);
              setTimeout(attemptResume, 100);
            } else {
              console.log('[usePersistentVideoState] Auto-resume timed out after max retries');
              hasAttemptedAutoResume.current = true;
              sessionStorage.removeItem('tv-was-playing-before-unmount');
            }
          };
          
          attemptResume();
        }
      }
    }
    
    // Reset attempt flag when video changes
    if (currentFileId) {
      hasAttemptedAutoResume.current = false;
    }
  }, [activeMediaRoute, currentFileId, currentVideoPath, lastPlaybackPosition, setIsMediaPlaying]);

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

  // Phase 1: Register video element and capture its actual src
  const registerVideoElement = (element: HTMLVideoElement | null) => {
    console.log('[usePersistentVideoState] registerVideoElement called', {
      hasElement: !!element,
      readyState: element?.readyState,
      src: element?.src,
      currentFileId
    });
    
    videoElementRef.current = element;
    
    if (element) {
      // Phase 1: Capture the actual video src and update currentVideoPath
      if (element.src && element.src !== currentVideoPath) {
        console.log('[usePersistentVideoState] Updating currentVideoPath from video element:', element.src);
        setCurrentVideoPath(element.src);
      }
      
      if (currentFileId) {
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
        
        // Phase 1: Track when src changes to update currentVideoPath
        const handleLoadedMetadata = () => {
          if (element.src && element.src !== currentVideoPath) {
            console.log('[usePersistentVideoState] Video src loaded, updating currentVideoPath:', element.src);
            setCurrentVideoPath(element.src);
          }
        };
        
        element.addEventListener('timeupdate', handleTimeUpdate);
        element.addEventListener('loadstart', handleLoadStart);
        element.addEventListener('canplay', handleCanPlay);
        element.addEventListener('error', handleError);
        element.addEventListener('loadedmetadata', handleLoadedMetadata);
        
        return () => {
          element.removeEventListener('timeupdate', handleTimeUpdate);
          element.removeEventListener('loadstart', handleLoadStart);
          element.removeEventListener('canplay', handleCanPlay);
          element.removeEventListener('error', handleError);
          element.removeEventListener('loadedmetadata', handleLoadedMetadata);
        };
      }
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
