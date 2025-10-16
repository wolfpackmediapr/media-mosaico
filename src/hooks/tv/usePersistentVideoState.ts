import { useState, useEffect, useRef } from "react";
import { useMediaPersistence } from "@/context/MediaPersistenceContext";
import { usePersistentState } from "@/hooks/use-persistent-state";
import { useVideoVisibilitySync } from "./processing/useVideoVisibilitySync";

// Module-level cache for blob URLs (survives tab switches, not page reloads)
const blobUrlMemoryCache = new Map<string, string>();

// Helper to generate stable file IDs
const getFileId = (file: any): string => {
  return file._fileId || file.filePath || `${file.name}-${file.size}-${file.lastModified}`;
};

// Debug helper for monitoring blob cache
if (typeof window !== 'undefined') {
  (window as any).debugTvBlobCache = () => {
    console.log('Blob URL Memory Cache:', {
      size: blobUrlMemoryCache.size,
      entries: Array.from(blobUrlMemoryCache.entries()).map(([id, url]) => ({
        id,
        url: url.substring(0, 50) + '...'
      }))
    });
  };
}

interface UploadedFile extends File {
  preview?: string;
  filePath?: string;
  _fileId?: string;
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
  
  // Phase 4: File management state with stable ID serialization
  const [uploadedFiles, setUploadedFiles] = usePersistentState<UploadedFile[]>(
    "tv-uploaded-files",
    [],
    { 
      storage: 'sessionStorage',
      serialize: (files) => {
        const sanitized = files.map(f => {
          const fileId = getFileId(f);
          
          // CRITICAL: Cache blob URLs in memory before serializing
          if (f.preview?.startsWith('blob:')) {
            console.log(`[usePersistentVideoState] Caching blob URL for ${fileId}:`, f.preview.substring(0, 50));
            blobUrlMemoryCache.set(fileId, f.preview);
          }
          
          return {
            name: f.name,
            size: f.size,
            type: f.type,
            lastModified: f.lastModified,
            // Keep blob URLs in sessionStorage for same-session recovery
            preview: f.preview,
            filePath: f.filePath,
            _fileId: fileId
          };
        });
        console.log(`[usePersistentVideoState] Serialized ${files.length} files`);
        return JSON.stringify(sanitized);
      },
      deserialize: (str) => {
        if (!str || str === '[]') {
          console.log('[usePersistentVideoState] Empty file list in sessionStorage');
          return [];
        }
        
        const parsed = JSON.parse(str);
        console.log(`[usePersistentVideoState] Deserializing ${parsed.length} files`);
        
        return parsed.map((fileData: any) => {
          const fileId = fileData._fileId;
          
          // Try to restore blob URL from memory cache first
          const cachedBlobUrl = blobUrlMemoryCache.get(fileId);
          const effectivePreview = cachedBlobUrl || fileData.preview;
          
          console.log(`[usePersistentVideoState] Restoring file ${fileId}:`, {
            hadCachedBlob: !!cachedBlobUrl,
            hadStoredPreview: !!fileData.preview,
            hasFilePath: !!fileData.filePath,
            effectivePreview: effectivePreview?.substring(0, 50)
          });
          
          const file = new File([], fileData.name, {
            type: fileData.type,
            lastModified: fileData.lastModified
          });
          
          return Object.assign(file, {
            preview: effectivePreview,
            filePath: fileData.filePath,
            _fileId: fileId
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

  // Radio-style visibility sync - no pause on hide, but resume on show
  const triggerPlay = () => {
    if (videoElementRef.current && !videoElementRef.current.paused) {
      console.log('[usePersistentVideoState] Video already playing, skipping triggerPlay');
      return;
    }
    if (videoElementRef.current) {
      const playPromise = videoElementRef.current.play();
      if (playPromise) {
        playPromise
          .then(() => {
            setIsMediaPlaying(true);
            console.log('[usePersistentVideoState] Video play successful');
          })
          .catch(err => {
            console.error('[usePersistentVideoState] Video play failed:', err);
          });
      }
    }
  };

  useVideoVisibilitySync({
    isPlaying: isMediaPlaying,
    isReady,
    currentVideoPath,
    videoElementRef,
    triggerPlay,
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
        
        // Clear memory cache when route changes (not on tab switches)
        console.log('[usePersistentVideoState] Clearing blob URL memory cache');
        blobUrlMemoryCache.clear();
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

  // Enhanced Media Session API - tells browser to prioritize this media
  useEffect(() => {
    if (activeMediaRoute === '/tv' && 'mediaSession' in navigator) {
      navigator.mediaSession.playbackState = isMediaPlaying ? 'playing' : 'paused';
      
      // Set up media session metadata if we have a current video
      if (currentVideoPath) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: 'TV Video Analysis',
          artist: 'Medios Monitoring',
          artwork: [
            { src: '/favicon.ico', sizes: '96x96', type: 'image/x-icon' }
          ]
        });
        
        // Update position state for better OS integration (prevents throttling)
        if (videoElementRef.current) {
          try {
            navigator.mediaSession.setPositionState({
              duration: videoElementRef.current.duration || 0,
              playbackRate: videoElementRef.current.playbackRate || 1,
              position: videoElementRef.current.currentTime || 0
            });
          } catch (e) {
            // Some browsers don't support position state yet
            console.warn('[usePersistentVideoState] Media Session position state not supported');
          }
        }
      }

      // Set up media session action handlers
      navigator.mediaSession.setActionHandler('play', () => {
        if (videoElementRef.current) {
          videoElementRef.current.play();
        }
        setIsMediaPlaying(true);
      });

      navigator.mediaSession.setActionHandler('pause', () => {
        if (videoElementRef.current) {
          videoElementRef.current.pause();
        }
        setIsMediaPlaying(false);
      });

      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined && videoElementRef.current) {
          videoElementRef.current.currentTime = details.seekTime;
          setCurrentTime(details.seekTime);
        }
      });
      
      // Cleanup on unmount
      return () => {
        if ('mediaSession' in navigator) {
          navigator.mediaSession.setActionHandler('play', null);
          navigator.mediaSession.setActionHandler('pause', null);
          navigator.mediaSession.setActionHandler('seekto', null);
        }
      };
    }
  }, [activeMediaRoute, isMediaPlaying, currentVideoPath, currentTime, setIsMediaPlaying]);

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
    setCurrentVideoPath
  };
};
