import { useState, useEffect, useRef } from "react";
import { useMediaPersistence } from "@/context/MediaPersistenceContext";
import { usePersistentState } from "@/hooks/use-persistent-state";
import { useVideoVisibilitySync } from "./processing/useVideoVisibilitySync";
import { 
  cacheFile, 
  getCachedFile, 
  recreateBlobUrl, 
  getFileId as getCacheFileId,
  removeFromCache 
} from "./useFileCache";

// Use cache's getFileId for consistency
const getFileId = (file: any): string => {
  return file._fileId || getCacheFileId(file);
};

interface UploadedFile extends File {
  preview?: string;
  filePath?: string;
  _fileId?: string;
  _originalSize?: number;
}

export interface PersistentVideoStateReturn {
  uploadedFiles: UploadedFile[];
  setUploadedFiles: (files: UploadedFile[]) => void;
  isPlaying: boolean;
  volume: number[];
  currentVideoPath: string | undefined;
  currentTime: number;
  currentFileId: string | undefined;
  isReady: boolean;
  isLoading: boolean;
  isRestoring: boolean; // NEW: State restoration indicator
  videoElementRef: React.RefObject<HTMLVideoElement>;
  onTogglePlayback: () => void;
  onVolumeChange: (value: number[]) => void;
  onPlayPause: () => void;
  onSeekToTimestamp: (timestamp: number) => void;
  registerVideoElement: (element: HTMLVideoElement | null) => void;
  isActiveMediaRoute: boolean;
  setIsMediaPlaying: (playing: boolean) => void;
  setCurrentVideoPath: (path: string | undefined) => void;
}

export const usePersistentVideoState = (): PersistentVideoStateReturn => {
  const { 
    activeMediaRoute, 
    setActiveMediaRoute, 
    isMediaPlaying, 
    setIsMediaPlaying,
    updatePlaybackPosition,
    lastPlaybackPosition 
  } = useMediaPersistence();
  
  // File management with caching support for tab-switch recovery
  const [uploadedFiles, setUploadedFilesInternal] = usePersistentState<UploadedFile[]>(
    "tv-uploaded-files",
    [],
    { 
      storage: 'sessionStorage',
      serialize: (files) => {
        const sanitized = files.map(f => {
          const fileId = getFileId(f);
          // Get original size from cache or use current size
          const cachedFile = getCachedFile(fileId);
          const originalSize = cachedFile?.originalSize || f._originalSize || f.size;
          
          return {
            name: f.name,
            size: f.size,
            type: f.type,
            lastModified: f.lastModified,
            preview: f.preview,
            filePath: f.filePath,
            _fileId: fileId,
            _originalSize: originalSize
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
          
          // Try to get blob URL from cache first (survives tab switch)
          const cachedFile = getCachedFile(fileId);
          let effectivePreview = cachedFile?.blobUrl;
          
          // If no cached blob, use filePath (Supabase URL) 
          if (!effectivePreview && fileData.filePath) {
            effectivePreview = fileData.filePath;
          }
          
          // Last resort: use stored preview if it's not a blob URL
          if (!effectivePreview && fileData.preview && !fileData.preview.startsWith('blob:')) {
            effectivePreview = fileData.preview;
          }
          
          console.log(`[usePersistentVideoState] Restoring file ${fileId}:`, {
            hasCachedBlob: !!cachedFile,
            hasFilePath: !!fileData.filePath,
            effectivePreview: effectivePreview?.substring(0, 80)
          });
          
          const file = new File([], fileData.name, {
            type: fileData.type,
            lastModified: fileData.lastModified
          });
          
          return Object.assign(file, {
            preview: effectivePreview,
            filePath: fileData.filePath,
            _fileId: fileId,
            _originalSize: fileData._originalSize || fileData.size
          }) as UploadedFile;
        });
      }
    }
  );

  // Wrapper for setUploadedFiles that caches new files
  const setUploadedFiles = (files: UploadedFile[]) => {
    const processedFiles = files.map(f => {
      // If this is a real File with content (size > 0), cache it
      if (f.size > 0 && f instanceof File) {
        const { fileId, blobUrl } = cacheFile(f);
        
        // Update preview to use cached blob URL if not already set to a permanent URL
        if (!f.filePath || f.filePath.startsWith('blob:')) {
          return Object.assign(f, {
            preview: blobUrl,
            _fileId: fileId,
            _originalSize: f.size
          }) as UploadedFile;
        }
      }
      return f;
    });
    
    setUploadedFilesInternal(processedFiles);
  };
  
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
  
  // NEW: State restoration indicator - starts true, set to false after hydration
  const [isRestoring, setIsRestoring] = useState(true);
  
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
    
    // Mark restoration complete after a short delay to allow hydration
    const restoreTimer = setTimeout(() => {
      setIsRestoring(false);
      console.log('[usePersistentVideoState] State restoration complete');
    }, 150);
    
    // Save state on unmount/route change
    return () => {
      clearTimeout(restoreTimer);
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

  // FIX: Restore permanent video URL from sessionStorage and update uploadedFiles
  useEffect(() => {
    // Check if we have a stored permanent URL from upload
    const storedVideoUrl = sessionStorage.getItem('tv-uploaded-video-url');
    const storedFilename = sessionStorage.getItem('tv-uploaded-video-filename');
    
    if (storedVideoUrl && uploadedFiles.length > 0) {
      const firstFile = uploadedFiles[0];
      
      // If the file doesn't have a filePath yet, or has an invalid blob URL, update it
      if (!firstFile.filePath || firstFile.filePath.startsWith('blob:')) {
        console.log('[usePersistentVideoState] Restoring permanent URL from sessionStorage:', storedVideoUrl);
        
        // Update the file object with the permanent URL
        const updatedFile = Object.assign(firstFile, {
          filePath: storedVideoUrl,
          _fileId: firstFile._fileId || `${firstFile.name}-${firstFile.size}-${firstFile.lastModified}`
        });
        
        // Update uploadedFiles with the permanent URL
        setUploadedFiles([updatedFile]);
        
        // Also update currentVideoPath
        setCurrentVideoPath(storedVideoUrl);
        
        console.log('[usePersistentVideoState] Updated file with permanent URL');
      }
    }
    
    // Sync currentVideoPath with uploaded files - prioritize Supabase paths over blob URLs
    if (uploadedFiles.length > 0) {
      const firstFile = uploadedFiles[0];
      
      // FIX: Always prefer filePath (Supabase storage) over blob URLs
      const videoPath = firstFile.filePath || 
        (firstFile.preview && !firstFile.preview.startsWith('blob:') ? firstFile.preview : null);
      
      // Update if we have a valid path and current path is empty, blob, or different
      const shouldUpdate = videoPath && (
        !currentVideoPath || 
        currentVideoPath.startsWith('blob:') ||
        currentVideoPath !== videoPath
      );
      
      if (shouldUpdate) {
        console.log('[usePersistentVideoState] Updating currentVideoPath:', {
          from: currentVideoPath?.substring(0, 50),
          to: videoPath?.substring(0, 50),
          reason: !currentVideoPath ? 'empty' : currentVideoPath.startsWith('blob:') ? 'blob' : 'different'
        });
        setCurrentVideoPath(videoPath);
      }
    }
  }, [uploadedFiles, currentVideoPath, setCurrentVideoPath, setUploadedFiles]);

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
    isRestoring, // NEW: Export restoration state
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
