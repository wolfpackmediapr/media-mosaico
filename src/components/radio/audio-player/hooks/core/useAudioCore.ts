
import { useState, useEffect, useRef } from 'react';
import { Howl } from 'howler';
import { toast } from 'sonner';
import { getMimeTypeFromFile, canBrowserPlayFile } from '@/utils/audio-format-helper';

export interface AudioCoreState {
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
}

/**
 * Core hook for managing the Howl instance and basic audio state
 */
export const useAudioCore = ({
  file,
  onEnded,
  onError,
  forceHTML5 = false
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

  // Preload check using HTML5 audio
  const preloadCheck = (url: string): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!nativeAudioRef.current) {
        nativeAudioRef.current = new Audio();
      }
      
      const audio = nativeAudioRef.current;
      const timeoutId = setTimeout(() => {
        // If loading takes too long, consider it a failure
        resolve(false);
      }, 3000);
      
      const handleCanPlay = () => {
        clearTimeout(timeoutId);
        resolve(true);
      };
      
      const handleError = () => {
        clearTimeout(timeoutId);
        resolve(false);
      };
      
      audio.addEventListener('canplay', handleCanPlay, { once: true });
      audio.addEventListener('error', handleError, { once: true });
      
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
      return;
    }

    // Check if the file has changed
    const currentUrl = URL.createObjectURL(file);
    if (currentUrl === currentFileUrlRef.current) {
      console.log('[AudioCore] File is the same, skipping load');
      return;
    }

    // Revoke the previous URL to prevent memory leaks
    if (currentFileUrlRef.current) {
      URL.revokeObjectURL(currentFileUrlRef.current);
    }
    
    currentFileUrlRef.current = currentUrl;
    setIsLoading(true);
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

    // Pre-check using a native HTML5 audio element
    const initializeHowl = async () => {
      // Ensure we can play this file before initializing Howler
      const canPlayWithNative = await preloadCheck(currentUrl);
      console.log(`[AudioCore] Pre-check result: ${canPlayWithNative ? 'Can play' : 'Cannot play'} with native audio`);
      
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
          const errorMessage = `Failed to load audio: ${error}`;
          setPlaybackErrors(prev => ({ ...prev, howlerError: errorMessage }));
          setIsLoading(false);
          setIsReady(false);
          
          // Try to fallback to native HTML5 audio if Howler fails
          if (canPlayWithNative && nativeAudioRef.current) {
            console.log('[AudioCore] Howler failed but native audio can play. Consider using the native audio element directly.');
          }
          
          if (onError) onError(errorMessage);
        },
        onplayerror: (id, error) => {
          console.error('[AudioCore] Playback error:', error);
          if (onError) onError(`Playback error: ${error}`);
        }
      };
      
      // Create and configure the Howl instance
      const newHowl = new Howl(howlConfig);
    };

    // Start the initialization
    initializeHowl();

    return () => {
      // Clean up when the component unmounts or currentFile changes
      if (howl) {
        howl.unload();
      }
      URL.revokeObjectURL(currentUrl);
      currentFileUrlRef.current = null;
      
      // Clean up the native audio element
      if (nativeAudioRef.current) {
        nativeAudioRef.current.src = '';
        nativeAudioRef.current.load();
      }
    };
  }, [file, howl, onEnded, onError]);

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
