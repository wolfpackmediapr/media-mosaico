
import { useState, useEffect, useCallback } from 'react';
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

  useEffect(() => {
    let fileUrl: string | undefined;
    let sound: Howl | undefined;
    
    if (file) {
      try {
        setIsLoading(true);
        setIsReady(false);
        setPlaybackErrors(null);
        
        fileUrl = URL.createObjectURL(file);
        
        sound = new Howl({
          src: [fileUrl],
          html5: forceHTML5, // Force HTML5 Audio to avoid streaming issues
          preload: true,
          onload: () => {
            console.log('[useAudioCore] Audio loaded successfully');
            setIsLoading(false);
            setIsReady(true);
            setDuration(sound?.duration() || 0);
          },
          onloaderror: (id, error) => {
            console.error('[useAudioCore] Loading error:', error);
            setIsLoading(false);
            setPlaybackErrors(typeof error === 'string' ? error : 'Error loading audio');
            if (onError) onError(typeof error === 'string' ? error : 'Error loading audio');
          },
          onplayerror: (id, error) => {
            console.error('[useAudioCore] Playback error:', error);
            setPlaybackErrors(typeof error === 'string' ? error : 'Error during playback');
            if (onError) onError(typeof error === 'string' ? error : 'Error during playback');
          },
          onend: () => {
            if (onEnded) onEnded();
          }
        });
        
        setHowl(sound);
      } catch (error) {
        console.error('[useAudioCore] Error initializing audio:', error);
        setIsLoading(false);
        setPlaybackErrors(`Error initializing audio: ${error}`);
        if (onError) onError(`Error initializing audio: ${error}`);
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
