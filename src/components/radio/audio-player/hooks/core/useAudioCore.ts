import { useState, useEffect, useCallback } from "react";
import { Howl } from "howler";

interface UseAudioCoreProps {
  file?: File;
  onEnded?: () => void;
  onError?: (error: string) => void;
  onReady?: () => void;
  forceHTML5?: boolean;
  storageUrl?: string | null; // Add support for direct URLs
}

export const useAudioCore = ({
  file,
  onEnded,
  onError,
  onReady,
  forceHTML5 = false,
  storageUrl = null
}: UseAudioCoreProps) => {
  const [howl, setHowl] = useState<Howl | null>(null);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [playbackErrors, setPlaybackErrors] = useState<string | null>(null);

  const createHowl = useCallback((sourceUrl: string) => {
    try {
      setIsLoading(true);
      setIsReady(false);
      setPlaybackErrors(null);

      console.log(`[AudioCore] Creating Howl instance with ${forceHTML5 ? 'forced HTML5' : 'default'} mode`);
      
      const newHowl = new Howl({
        src: [sourceUrl],
        html5: forceHTML5, // Force HTML5 Audio to avoid streaming issues
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
        },
        onplayerror: (id, error) => {
          const errorMsg = typeof error === 'string' ? error : 'Playback error';
          console.error('[AudioCore] Play error:', errorMsg);
          setPlaybackErrors(errorMsg);
          if (onError) onError(errorMsg);
        },
        onend: () => {
          if (onEnded) onEnded();
        },
      });

      return newHowl;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error creating audio player';
      console.error('[AudioCore] Error creating Howl instance:', errorMsg);
      setIsLoading(false);
      setPlaybackErrors(errorMsg);
      if (onError) onError(errorMsg);
      return null;
    }
  }, [forceHTML5, onEnded, onError, onReady]);

  // Initialize Howl when the file changes
  useEffect(() => {
    // Clean up previous instance
    if (howl) {
      howl.unload();
      setHowl(null);
    }

    if (!file && !storageUrl) {
      return;
    }

    try {
      let sourceUrl;
      
      // If we have a storage URL, use it directly
      if (storageUrl) {
        sourceUrl = storageUrl;
        console.log('[AudioCore] Using provided storage URL:', sourceUrl);
      } else {
        // Otherwise create a blob URL from the file
        sourceUrl = URL.createObjectURL(file!);
        console.log('[AudioCore] Created blob URL for file:', file!.name);
      }
      
      const newHowl = createHowl(sourceUrl);
      if (newHowl) setHowl(newHowl);

      // Clean up the blob URL when the component unmounts or when the file changes
      return () => {
        if (sourceUrl && !storageUrl) {
          URL.revokeObjectURL(sourceUrl);
          console.log('[AudioCore] Revoked blob URL');
        }
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Error initializing audio';
      console.error('[AudioCore] Error during initialization:', errorMsg);
      setPlaybackErrors(errorMsg);
      if (onError) onError(errorMsg);
    }
  }, [file, createHowl, onError, storageUrl]);

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
