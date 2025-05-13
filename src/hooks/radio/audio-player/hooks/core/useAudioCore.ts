
import { useState, useEffect, useCallback, useRef } from 'react';
import { Howl } from 'howler';
import { toast } from 'sonner';
import { isBlobUrlFormat, safelyRevokeBlobUrl, createNewBlobUrl, isValidFileForBlobUrl } from '@/utils/audio-url-validator';

interface AudioCoreState {
  howl: Howl | null;
  isLoading: boolean;
  isReady: boolean;
  duration: number;
  currentUrl: string | null;
}

export interface PlaybackErrors {
  howlerError: string | null;
  contextError: string | null;
}

export interface UseAudioCoreOptions {
  file?: File;
  onEnded?: () => void;
  onError?: (error: string) => void;
  forceHTML5?: boolean;
  onInvalidBlobUrl?: (file: File) => void; // New callback for invalid blob URLs
}

// Helper to get MIME type from file
const getMimeTypeFromFile = (file: File): string => {
  if (file.type) return file.type;
  
  // Try to infer type from extension
  const ext = file.name.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'mp3': return 'audio/mpeg';
    case 'wav': return 'audio/wav';
    case 'ogg': return 'audio/ogg';
    case 'm4a': return 'audio/mp4';
    case 'aac': return 'audio/aac';
    default: return 'audio/mpeg'; // Default to mp3 if unknown
  }
};

// Check if browser can play this audio type
const canBrowserPlayFile = (file: File): boolean => {
  const audio = document.createElement('audio');
  const mimeType = getMimeTypeFromFile(file);
  
  // Check MIME type support
  return audio.canPlayType(mimeType) !== '';
};

/**
 * Core hook for managing the Howl instance and basic audio state
 */
export const useAudioCore = ({
  file,
  onEnded,
  onError,
  forceHTML5 = false,
  onInvalidBlobUrl
}: UseAudioCoreOptions): [
  AudioCoreState,
  React.Dispatch<React.SetStateAction<Howl | null>>,
  React.Dispatch<React.SetStateAction<PlaybackErrors>>
] => {
  const [howl, setHowl] = useState<Howl | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [duration, setDuration] = useState(0);
  const [playbackErrors, setPlaybackErrors] = useState<PlaybackErrors>({
    howlerError: null,
    contextError: null
  });
  
  const currentFileUrlRef = useRef<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const nativeAudioRef = useRef<HTMLAudioElement | null>(null);
  const loadAttemptsRef = useRef<number>(0);
  const blobUrlValidRef = useRef<boolean>(true);

  // Initialize AudioContext
  useEffect(() => {
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (error: any) {
        console.error('Error initializing AudioContext:', error);
        setPlaybackErrors(prev => ({ ...prev, contextError: error.message }));
      }
    }
    
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close().then(() => {
          console.log('[AudioCore] AudioContext closed');
        }).catch(error => {
          console.error('Error closing AudioContext:', error);
        });
        audioContextRef.current = null;
      }
    };
  }, []);

  // Validate and potentially recreate Blob URL for a file
  const validateAndUpdateBlobUrl = useCallback((file: File): string => {
    // Check if file has a preview property with a blob URL
    if (!('preview' in file) || 
        typeof (file as any).preview !== 'string' || 
        !(file as any).preview.startsWith('blob:')) {
      // No preview or not a blob URL, create a new one
      console.log('[AudioCore] Creating new blob URL for file');
      const newUrl = createNewBlobUrl(file);
      if ('preview' in file) {
        (file as any).preview = newUrl;
      }
      return newUrl;
    }
    
    // Simple check to avoid unnecessarily recreating the URL
    if (blobUrlValidRef.current && isBlobUrlFormat((file as any).preview)) {
      return (file as any).preview;
    }
    
    // If we've flagged the URL as invalid, create a new one
    console.log('[AudioCore] Blob URL marked invalid, creating new one');
    blobUrlValidRef.current = true;
    
    // Revoke the old URL
    safelyRevokeBlobUrl((file as any).preview);
    
    // Create a new blob URL
    const newUrl = createNewBlobUrl(file);
    (file as any).preview = newUrl;
    
    // Notify caller about invalid blob URL
    if (onInvalidBlobUrl) {
      onInvalidBlobUrl(file);
    }
    
    return newUrl;
  }, [onInvalidBlobUrl]);

  // Preload check using HTML5 audio
  const preloadCheck = (url: string): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!nativeAudioRef.current) {
        nativeAudioRef.current = new Audio();
      }
      
      const audio = nativeAudioRef.current;
      const timeoutId = setTimeout(() => {
        // If loading takes too long, consider it a failure
        console.log('[AudioCore] Preload check timed out');
        resolve(false);
      }, 3000);
      
      const handleCanPlay = () => {
        clearTimeout(timeoutId);
        console.log('[AudioCore] Preload check successful - can play with native audio');
        resolve(true);
      };
      
      const handleError = (e: ErrorEvent) => {
        clearTimeout(timeoutId);
        
        // Check for range error which indicates an invalid blob URL
        const target = e.target as HTMLAudioElement;
        const errorText = e.message || (target.error ? target.error.message : 'Unknown error');
        
        console.warn('[AudioCore] Preload check failed:', errorText);
        
        if (errorText.includes('range not satisfiable') || 
            errorText.includes('ERR_REQUEST_RANGE_NOT_SATISFIABLE') ||
            errorText.includes('net::ERR_METHOD_NOT_SUPPORTED')) {
          blobUrlValidRef.current = false;
        }
        
        resolve(false);
      };
      
      audio.addEventListener('canplay', handleCanPlay, { once: true });
      audio.addEventListener('error', handleError as EventListener, { once: true });
      
      try {
        audio.src = url;
        audio.load();
      } catch (e) {
        console.error('[AudioCore] Error during audio.load():', e);
        clearTimeout(timeoutId);
        resolve(false);
      }
    });
  };

  // Load and unload audio file
  useEffect(() => {
    if (!file) {
      // No file selected, clear audio and reset state
      if (howl) {
        howl.unload();
        setHowl(null);
      }
      setIsLoading(false);
      setIsReady(false);
      setDuration(0);
      loadAttemptsRef.current = 0;
      return;
    }

    // Set loading state while we process
    setIsLoading(true);
    
    const initializeAudio = async () => {
      try {
        // Create or validate blob URL
        const currentUrl = validateAndUpdateBlobUrl(file);
        
        // Revoke the previous URL to prevent memory leaks
        if (currentFileUrlRef.current && currentFileUrlRef.current !== currentUrl) {
          URL.revokeObjectURL(currentFileUrlRef.current);
        }
        
        currentFileUrlRef.current = currentUrl;
        loadAttemptsRef.current = 0;
        console.log('[AudioCore] Loading audio:', currentUrl);
        
        // Destroy the previous Howl instance if it exists
        if (howl) {
          howl.unload();
        }
        
        // Check if we can play this with native first - no fetch calls
        const canPlayWithNative = await preloadCheck(currentUrl);
        console.log(`[AudioCore] Pre-check result: ${canPlayWithNative ? 'Can play' : 'Cannot play'} with native audio`);
        
        // If native can't play it, there may be an issue with the URL
        if (!canPlayWithNative) {
          // If we suspect the blob URL is invalid, try creating a new one
          if (!blobUrlValidRef.current) {
            safelyRevokeBlobUrl(currentUrl);
            const newUrl = createNewBlobUrl(file);
            currentFileUrlRef.current = newUrl;
            
            // Notify about the issue
            if (onInvalidBlobUrl) {
              onInvalidBlobUrl(file);
            }
            
            // Try again with new URL
            const retrySuccess = await preloadCheck(newUrl);
            if (!retrySuccess) {
              // If still fails, report the issue
              setPlaybackErrors(prev => ({ 
                ...prev, 
                howlerError: `Browser cannot play this audio file: ${file.name}` 
              }));
              setIsLoading(false);
              
              if (onError) onError(`Format not supported: ${file.name.split('.').pop()?.toUpperCase()}`);
              return;
            }
          } else {
            // File format might not be supported
            setPlaybackErrors(prev => ({ 
              ...prev, 
              howlerError: `Browser cannot play this audio format: ${file.name.split('.').pop()?.toUpperCase()}` 
            }));
            setIsLoading(false);
            
            if (onError) onError(`Format not supported: ${file.name.split('.').pop()?.toUpperCase()}`);
            return;
          }
        }
        
        // Prepare format configuration
        const format = file.name.split('.').pop()?.toLowerCase();
        
        const howlConfig: Howl.Options = {
          src: [currentFileUrlRef.current],
          html5: true, // Always use HTML5 Audio for large files and better format support
          format: format ? [format] : undefined, // Explicitly tell Howler the format
          preload: true,
          onload: () => {
            console.log('[AudioCore] Audio loaded successfully');
            setHowl(newHowl);
            setDuration(newHowl.duration());
            setPlaybackErrors({ howlerError: null, contextError: null });
            setIsLoading(false);
            setIsReady(true);
          },
          onend: () => {
            console.log('[AudioCore] Audio ended');
            if (onEnded) onEnded();
          },
          onloaderror: (id, error) => {
            console.error('[AudioCore] Load error:', error);
            const errorMessage = `${error}`;
            
            // Check if the error indicates an invalid blob URL
            if (typeof error === 'string' && 
                (error.includes('ERR_REQUEST_RANGE_NOT_SATISFIABLE') || 
                 error.includes('range not satisfiable') ||
                 error.includes('net::ERR_METHOD_NOT_SUPPORTED'))) {
              
              // Mark as invalid for the next attempt
              blobUrlValidRef.current = false;
              
              // Notify about invalid blob URL
              if (onInvalidBlobUrl) {
                onInvalidBlobUrl(file);
              }
            }
            
            setPlaybackErrors(prev => ({ ...prev, howlerError: errorMessage }));
            setIsLoading(false);
            setIsReady(false);
            
            if (onError) onError(errorMessage);
          },
          onplayerror: (id, error) => {
            console.error('[AudioCore] Playback error:', error);
            if (onError) onError(`Playback error: ${error}`);
          }
        };
        
        // Create and configure the Howl instance
        const newHowl = new Howl(howlConfig);
        
      } catch (error) {
        console.error('[AudioCore] Error initializing audio:', error);
        setIsLoading(false);
        const errorMessage = `Error initializing audio: ${error}`;
        setPlaybackErrors(prev => ({ ...prev, howlerError: errorMessage }));
        if (onError) onError(errorMessage);
      }
    };
    
    // Initialize the audio
    initializeAudio();

    return () => {
      // Clean up when the component unmounts or currentFile changes
      if (howl) {
        howl.unload();
      }
      if (currentFileUrlRef.current) {
        URL.revokeObjectURL(currentFileUrlRef.current);
        currentFileUrlRef.current = null;
      }
      
      // Clean up the native audio element
      if (nativeAudioRef.current) {
        nativeAudioRef.current.src = '';
        nativeAudioRef.current.load();
      }
    };
  }, [file, howl, onEnded, onError, onInvalidBlobUrl, validateAndUpdateBlobUrl]);

  return [
    { 
      howl, 
      isLoading, 
      isReady, 
      duration,
      currentUrl: currentFileUrlRef.current
    },
    setHowl,
    setPlaybackErrors
  ];
};
