
import { useState, useEffect, useCallback, useRef } from 'react';
import { Howl } from 'howler';

interface AudioCoreProps {
  file?: File;
  onEnded?: () => void;
  onError?: (error: string) => void;
  forceHTML5?: boolean;
}

/**
 * Core hook for setting up Howler audio instance
 */
export const useAudioCore = ({
  file,
  onEnded,
  onError,
  forceHTML5 = false
}: AudioCoreProps) => {
  const [howl, setHowl] = useState<Howl | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [duration, setDuration] = useState(0);
  const [playbackErrors, setPlaybackErrors] = useState<string | null>(null);
  
  // Add file URL reference to prevent memory leaks
  const currentFileUrlRef = useRef<string | null>(null);
  const loadAttemptsRef = useRef<number>(0);

  useEffect(() => {
    let fileUrl: string | undefined;
    let sound: Howl | undefined;
    
    if (file) {
      try {
        setIsLoading(true);
        setIsReady(false);
        setPlaybackErrors(null);
        
        // Check if file has changed
        fileUrl = URL.createObjectURL(file);
        if (fileUrl === currentFileUrlRef.current) {
          console.log('[useAudioCore] Same file, skipping reload');
          setIsLoading(false);
          return;
        }
        
        // Store current file URL
        currentFileUrlRef.current = fileUrl;
        loadAttemptsRef.current = 0;
        
        console.log(`[useAudioCore] Loading audio file: ${file.name} (${file.type}), size: ${Math.round(file.size/1024)}KB`);
        
        sound = new Howl({
          src: [fileUrl],
          html5: true, // Always use HTML5 Audio to avoid streaming issues 
          preload: true,
          format: [file.name.split('.').pop()?.toLowerCase()], // Explicitly specify format
          onload: () => {
            console.log('[useAudioCore] Audio loaded successfully');
            setIsLoading(false);
            setIsReady(true);
            setDuration(sound?.duration() || 0);
          },
          onloaderror: (id, error) => {
            console.error('[useAudioCore] Loading error:', error);
            setIsLoading(false);
            loadAttemptsRef.current += 1;
            
            if (loadAttemptsRef.current <= 2) {
              console.log(`[useAudioCore] Retry attempt ${loadAttemptsRef.current}`);
              // Don't report error on first retry
              return;
            }
            
            const errorMessage = typeof error === 'string' ? error : 'Error loading audio';
            setPlaybackErrors(errorMessage);
            if (onError) onError(errorMessage);
          },
          onplayerror: (id, error) => {
            console.error('[useAudioCore] Playback error:', error);
            const errorMessage = typeof error === 'string' ? error : 'Error during playback';
            setPlaybackErrors(errorMessage);
            if (onError) onError(errorMessage);
          },
          onend: () => {
            if (onEnded) onEnded();
          }
        });
        
        setHowl(sound);
      } catch (error) {
        console.error('[useAudioCore] Error initializing audio:', error);
        setIsLoading(false);
        const errorMessage = `Error initializing audio: ${error}`;
        setPlaybackErrors(errorMessage);
        if (onError) onError(errorMessage);
      }
    }
    
    return () => {
      if (sound) {
        sound.unload();
      }
      if (fileUrl) {
        URL.revokeObjectURL(fileUrl);
      }
    };
  }, [file, onEnded, onError, forceHTML5]);

  return [
    {
      howl,
      isLoading,
      isReady,
      duration,
      playbackErrors
    },
    setHowl,
    setPlaybackErrors
  ] as const;
};
