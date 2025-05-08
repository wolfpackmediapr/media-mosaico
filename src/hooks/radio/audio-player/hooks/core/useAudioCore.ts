import { useState, useEffect, useCallback, useRef } from 'react';
import { Howl } from 'howler';
import { toast } from 'sonner';
import { getMimeTypeFromFile, canBrowserPlayFile } from '@/utils/audio-format-helper';
import { isValidBlobUrl, createNewBlobUrl } from '@/utils/audio-url-validator';

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
  onInvalidBlobUrl?: (file: File) => void;
  storageUrl?: string | null;
}

/**
 * Core hook for managing the Howl instance and basic audio state
 */
export const useAudioCore = ({
  file,
  onEnded,
  onError,
  forceHTML5 = false,
  onInvalidBlobUrl,
  storageUrl = null
}: UseAudioCoreOptions) => {
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
  const validateAndUpdateBlobUrl = useCallback(async (file: File): Promise<string> => {
    // If we have a storage URL, prioritize it
    if (storageUrl) {
      console.log('[AudioCore] Using provided storage URL instead of blob URL');
      return storageUrl;
    }
    
    // Check if file has a preview property with a blob URL
    if (!('preview' in file) || 
        typeof file.preview !== 'string' || 
        !file.preview.startsWith('blob:')) {
      // No preview or not a blob URL, create a new one
      console.log('[AudioCore] Creating new blob URL for file');
      const newUrl = createNewBlobUrl(file);
      if ('preview' in file) {
        (file as any).preview = newUrl;
      }
      return newUrl;
    }
    
    // Check if the existing URL is valid
    const isValid = await isValidBlobUrl(file.preview);
    
    if (!isValid) {
      console.log('[AudioCore] Blob URL invalid, creating new one');
      blobUrlValidRef.current = false;
      
      // Create a new blob URL
      const newUrl = createNewBlobUrl(file);
      (file as any).preview = newUrl;
      
      // Notify caller about invalid blob URL
      if (onInvalidBlobUrl) {
        onInvalidBlobUrl(file);
      }
      
      return newUrl;
    }
    
    // URL is valid, use it
    blobUrlValidRef.current = true;
    return file.preview;
  }, [onInvalidBlobUrl, storageUrl]);

  // Preload check using HTML5 audio
  const preloadCheck = async (url: string): Promise<boolean> => {
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
        
        if (errorText.includes('ERR_REQUEST_RANGE_NOT_SATISFIABLE') || 
            errorText.includes('range not satisfiable')) {
          blobUrlValidRef.current = false;
        }
        
        resolve(false);
      };
      
      audio.addEventListener('canplay', handleCanPlay, { once: true });
      audio.addEventListener('error', handleError as EventListener, { once: true });
      
      audio.src = url;
      audio.load();
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
        // Validate or create blob URL, or use storage URL if provided
        const currentUrl = await validateAndUpdateBlobUrl(file);
        
        // Check if the file is the same
        if (currentUrl === currentFileUrlRef.current) {
          console.log('[AudioCore] File is the same and URL is valid, skipping load');
          setIsLoading(false);
          return;
        }
        
        // Revoke the previous URL to prevent memory leaks
        if (currentFileUrlRef.current && currentFileUrlRef.current.startsWith('blob:')) {
          URL.revokeObjectURL(currentFileUrlRef.current);
        }
        
        currentFileUrlRef.current = currentUrl;
        loadAttemptsRef.current = 0;
        console.log('[AudioCore] Loading audio:', currentUrl);
        
        // Destroy the previous Howl instance if it exists
        if (howl) {
          howl.unload();
        }
        
        // Get MIME type for better format support
        const mimeType = getMimeTypeFromFile(file);
        const canPlay = canBrowserPlayFile(file);
        
        if (!canPlay) {
          console.warn(`[AudioCore] Format may not be supported: ${file.name}`);
        }
        
        // Check if we can play this with native first
        const canPlayWithNative = await preloadCheck(currentUrl);
        console.log(`[AudioCore] Pre-check result: ${canPlayWithNative ? 'Can play' : 'Cannot play'} with native audio`);
        
        // If native still can't play it, there's no point trying with Howler
        if (!canPlayWithNative) {
          console.error('[AudioCore] Native audio can\'t play this file, Howler will likely fail too');
          setPlaybackErrors(prev => ({ 
            ...prev, 
            howlerError: `Browser cannot play this audio format: ${file.name.split('.').pop()?.toUpperCase()}` 
          }));
          setIsLoading(false);
          
          if (onError) onError(`Format not supported: ${file.name.split('.').pop()?.toUpperCase()}`);
          return;
        }
        
        // Prepare format configuration
        const format = file.name.split('.').pop()?.toLowerCase();
        
        const howlConfig: Howl.Options = {
          src: [currentUrl],
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
                 error.includes('range not satisfiable'))) {
              
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

  return {
    howl, 
    setHowl, 
    duration, 
    isLoading, 
    isReady, 
    playbackErrors, 
    setPlaybackErrors,
    currentUrl: currentFileUrlRef.current
  };
};
