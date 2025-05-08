
import { useState, useEffect, useCallback } from "react";
import { Howl } from "howler";
import { ensureValidBlobUrl } from '@/utils/audio-url-validator';

interface UseAudioCoreProps {
  file?: File;
  onEnded?: () => void;
  onError?: (error: string) => void;
  onReady?: () => void;
  forceHTML5?: boolean;
  storageUrl?: string | null; 
  onInvalidBlobUrl?: (file: File) => void;
}

export const useAudioCore = ({
  file,
  onEnded,
  onError,
  onReady,
  forceHTML5 = false,
  storageUrl = null,
  onInvalidBlobUrl
}: UseAudioCoreProps) => {
  const [howl, setHowl] = useState<Howl | null>(null);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [playbackErrors, setPlaybackErrors] = useState<string | null>(null);

  const createHowl = useCallback(async (file: File | undefined, preferStorageUrl: string | null) => {
    try {
      setIsLoading(true);
      setIsReady(false);
      setPlaybackErrors(null);

      if (!file) {
        setIsLoading(false);
        return null;
      }

      // Validate file object
      if (!(file instanceof File)) {
        console.error('[AudioCore] Invalid file object');
        setIsLoading(false);
        setPlaybackErrors('Invalid file object');
        if (onError) onError('Invalid file object');
        return null;
      }

      // Determine which URL to use - storage has priority
      let sourceUrl: string;
      let isUsingStorageUrl = false;
      
      if (preferStorageUrl) {
        // If we have a storage URL, use it directly
        sourceUrl = preferStorageUrl;
        isUsingStorageUrl = true;
        console.log('[AudioCore] Using provided storage URL:', sourceUrl);
      } else {
        // Otherwise try to get a valid blob URL
        try {
          sourceUrl = await ensureValidBlobUrl(file);
          console.log('[AudioCore] Using blob URL for file:', file.name);
        } catch (error) {
          console.error('[AudioCore] Error creating blob URL:', error);
          
          // If we have onInvalidBlobUrl handler, call it
          if (onInvalidBlobUrl && file) {
            console.log('[AudioCore] Notifying about invalid blob URL');
            onInvalidBlobUrl(file);
          }
          
          // We can't continue without a valid URL
          setIsLoading(false);
          setPlaybackErrors('Failed to create a valid URL for audio playback');
          if (onError) onError('Failed to create a valid URL for audio playback');
          return null;
        }
      }
      
      console.log(`[AudioCore] Creating Howl instance with ${forceHTML5 ? 'forced HTML5' : 'default'} mode`);
      
      const newHowl = new Howl({
        src: [sourceUrl],
        html5: forceHTML5 || isUsingStorageUrl, // Force HTML5 Audio for storage URLs to avoid CORS issues
        onload: () => {
          setIsLoading(false);
          setIsReady(true);
          setDuration(newHowl.duration());
          if (onReady) onReady();
          console.log(`[AudioCore] Howl loaded, duration: ${newHowl.duration()}s`);
        },
        onloaderror: (id, error) => {
          setIsLoading(false);
          const errorMsg = typeof error === 'string' ? error : 'Failed to load audio';
          console.error('[AudioCore] Load error:', errorMsg);
          setPlaybackErrors(errorMsg);
          if (onError) onError(errorMsg);
          
          // If blob URL is invalid and we have a handler
          if (!isUsingStorageUrl && onInvalidBlobUrl && file) {
            console.log('[AudioCore] Notifying about invalid blob URL from onloaderror');
            onInvalidBlobUrl(file);
          }
        },
        onplayerror: (id, error) => {
          const errorMsg = typeof error === 'string' ? error : 'Playback error';
          console.error('[AudioCore] Play error:', errorMsg);
          setPlaybackErrors(errorMsg);
          if (onError) onError(errorMsg);
          
          // Consider switching to storage if a playback error occurs with a blob URL
          if (!isUsingStorageUrl && onInvalidBlobUrl && file) {
            console.log('[AudioCore] Notifying about playback error with blob URL');
            onInvalidBlobUrl(file);
          }
        },
        onend: () => {
          if (onEnded) onEnded();
        },
      });

      return newHowl;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error creating audio player';
      console.error('[AudioCore] Error initializing audio:', error);
      setIsLoading(false);
      setPlaybackErrors(errorMsg);
      if (onError) onError(errorMsg);
      return null;
    }
  }, [forceHTML5, onEnded, onError, onReady, onInvalidBlobUrl]);

  // Initialize Howl when the file or storageUrl changes
  useEffect(() => {
    // Clean up previous instance
    if (howl) {
      howl.unload();
      setHowl(null);
    }

    if (!file && !storageUrl) {
      return;
    }

    // Make sure we're dealing with a valid file object before proceeding
    if (file && !(file instanceof File)) {
      console.error('[AudioCore] Invalid file object provided');
      setPlaybackErrors('Invalid file object');
      if (onError) onError('Invalid file object');
      return;
    }

    // Create a new Howl instance with the appropriate URL
    createHowl(file, storageUrl).then(newHowl => {
      if (newHowl) setHowl(newHowl);
    });
    
    // Cleanup function
    return () => {
      if (howl) {
        howl.unload();
      }
      
      // Only revoke blob URLs, not storage URLs
      if (!storageUrl && file && 'preview' in file && 
          typeof file.preview === 'string' && 
          file.preview.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(file.preview as string);
          console.log('[AudioCore] Revoked blob URL');
        } catch (error) {
          console.warn('[AudioCore] Error revoking blob URL:', error);
        }
      }
    };
  }, [file, storageUrl, howl, createHowl, onError]);

  return { 
    howl, 
    setHowl, 
    duration, 
    isLoading, 
    isReady, 
    playbackErrors, 
    setPlaybackErrors
  };
};
