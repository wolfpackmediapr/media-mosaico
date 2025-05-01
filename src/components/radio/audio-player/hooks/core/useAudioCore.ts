
import { useState, useEffect, useRef } from 'react';
import { Howl } from 'howler';
import { toast } from 'sonner';

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
}

/**
 * Core hook for managing the Howl instance and basic audio state
 */
export const useAudioCore = ({
  file,
  onEnded,
  onError
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

    const newHowl = new Howl({
      src: [currentUrl],
      html5: true, // Force HTML5 Audio for large files
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
        setPlaybackErrors(prev => ({ ...prev, howlerError: `Failed to load audio: ${error}` }));
        setIsLoading(false);
        setIsReady(false);
      },
      onplayerror: (id, error) => {
        console.error('[AudioCore] Playback error:', error);
        if (onError) onError(`Playback error: ${error}`);
      }
    });

    return () => {
      // Clean up when the component unmounts or currentFile changes
      if (newHowl) {
        newHowl.unload();
      }
      URL.revokeObjectURL(currentUrl);
      currentFileUrlRef.current = null;
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
