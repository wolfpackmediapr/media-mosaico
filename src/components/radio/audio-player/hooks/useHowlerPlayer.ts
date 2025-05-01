
import { useState, useEffect, useRef, useCallback } from 'react';
import { Howl } from 'howler';
import { AudioMetadata } from '@/types/audio';

interface HowlerPlayerHookProps {
  file?: File;
  onEnded?: () => void;
  onError?: (error: string) => void;
  preservePlaybackOnBlur?: boolean;
  resumeOnFocus?: boolean;
}

interface PlaybackErrors {
  howlerError: string | null;
  contextError: string | null;
}

export const useHowlerPlayer = ({
  file,
  onEnded,
  onError,
  preservePlaybackOnBlur = true,
  resumeOnFocus = true
}: HowlerPlayerHookProps) => {
  const [howl, setHowl] = useState<Howl | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [metadata, setMetadata] = useState<AudioMetadata | null>(null);
  const [playbackErrors, setPlaybackErrors] = useState<PlaybackErrors>({
    howlerError: null,
    contextError: null
  });
  const [isSeeking, setIsSeeking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const intervalIdRef = useRef<number | null>(null);
  const currentFileUrlRef = useRef<string | null>(null);

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
          console.log('[HowlerPlayer] AudioContext closed');
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
      resetState();
      return;
    }

    // Check if the file has changed
    const currentUrl = URL.createObjectURL(file);
    if (currentUrl === currentFileUrlRef.current) {
      console.log('[HowlerPlayer] File is the same, skipping load');
      return;
    }

    // Revoke the previous URL to prevent memory leaks
    if (currentFileUrlRef.current) {
      URL.revokeObjectURL(currentFileUrlRef.current);
    }
    currentFileUrlRef.current = currentUrl;

    // Load new audio file
    loadAudio(currentUrl);

    return () => {
      // Clean up when the component unmounts or currentFile changes
      if (howl) {
        howl.unload();
      }
      resetState();
      URL.revokeObjectURL(currentUrl);
      currentFileUrlRef.current = null;
    };
  }, [file]);

  // Core Functions
  const loadAudio = (url: string) => {
    console.log('[HowlerPlayer] Loading audio:', url);
    setIsLoading(true);
    
    // Destroy the previous Howl instance if it exists
    if (howl) {
      howl.unload();
    }

    const newHowl = new Howl({
      src: [url],
      html5: true, // Force HTML5 Audio for large files
      volume: volume,
      rate: playbackRate,
      onload: () => {
        console.log('[HowlerPlayer] Audio loaded successfully');
        setHowl(newHowl);
        setDuration(newHowl.duration());
        setPlaybackErrors({ howlerError: null, contextError: null });
        setIsLoading(false);
        setIsReady(true);
      },
      onplay: () => {
        console.log('[HowlerPlayer] Audio started playing');
        setIsPlaying(true);
        startUpdateInterval();
      },
      onpause: () => {
        console.log('[HowlerPlayer] Audio paused');
        setIsPlaying(false);
        stopUpdateInterval();
      },
      onstop: () => {
        console.log('[HowlerPlayer] Audio stopped');
        setIsPlaying(false);
        stopUpdateInterval();
        setCurrentTime(0);
      },
      onseek: () => {
        console.log('[HowlerPlayer] Audio seeked');
        // Update current time immediately after seeking
        setCurrentTime(newHowl.seek());
      },
      onrate: () => {
        console.log('[HowlerPlayer] Playback rate changed to', playbackRate);
      },
      onvolume: () => {
        console.log('[HowlerPlayer] Volume changed to', volume);
      },
      onmute: () => {
        console.log('[HowlerPlayer] Audio muted:', isMuted);
      },
      onend: () => {
        console.log('[HowlerPlayer] Audio ended');
        setIsPlaying(false);
        stopUpdateInterval();
        setCurrentTime(0);
        if (onEnded) onEnded();
      },
      onloaderror: (id, error) => {
        console.error('[HowlerPlayer] Load error:', error);
        setPlaybackErrors(prev => ({ ...prev, howlerError: `Failed to load audio: ${error}` }));
        resetState();
      },
      onplayerror: (id, error) => {
        console.error('[HowlerPlayer] Playback error:', error);
        handlePlayError(id, error);
      }
    });
  };

  const handlePlayPause = useCallback(() => {
    if (!howl) return;

    if (isPlaying) {
      howl.pause();
    } else {
      howl.play();
    }
  }, [howl, isPlaying]);

  const handleSeek = (time: number) => {
    if (!howl) return;

    setIsSeeking(true);
    howl.seek(time);
    setCurrentTime(time); // Update immediately for responsiveness
    setIsSeeking(false);
  };

  const handleSkip = (direction: 'forward' | 'backward', amount: number = 10) => {
    if (!howl) return;

    const skipAmount = direction === 'forward' ? amount : -amount;
    const newTime = Math.max(0, Math.min(currentTime + skipAmount, duration));
    handleSeek(newTime);
  };

  const handleToggleMute = () => {
    setIsMuted(prev => !prev);
    howl?.mute(!isMuted);
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    howl?.volume(newVolume);
  };

  const handleVolumeUp = () => {
    const newVolume = Math.min(1, volume + 0.1);
    handleVolumeChange(newVolume);
  };

  const handleVolumeDown = () => {
    const newVolume = Math.max(0, volume - 0.1);
    handleVolumeChange(newVolume);
  };

  const handlePlaybackRateChange = (newRate: number) => {
    setPlaybackRate(newRate);
    howl?.rate(newRate);
  };

  const startUpdateInterval = () => {
    if (intervalIdRef.current) {
      stopUpdateInterval();
    }

    intervalIdRef.current = window.setInterval(() => {
      if (howl && howl.playing() && !isSeeking) {
        setCurrentTime(howl.seek());
      }
    }, 250);
  };

  const stopUpdateInterval = () => {
    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }
  };

  const resetState = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setVolume(1);
    setIsMuted(false);
    setPlaybackRate(1);
    setMetadata(null);
    setPlaybackErrors({ howlerError: null, contextError: null });
    setIsLoading(false);
    setIsReady(false);
    stopUpdateInterval();
  };

  const handlePlayError = async (id: number, error: any): Promise<boolean> => {
    if (!howl || !audioContextRef.current) return false;
    
    const audioContext = audioContextRef.current;

    // Create a utility function to safely handle errors
    const handleErrors = (error: unknown): { name?: string; message?: string } => {
      if (error && typeof error === 'object') {
        return error as { name?: string; message?: string };
      }
      return { message: String(error) };
    };

    // Use our handleErrors function instead of instanceof check
    try {
      // Try to resume the AudioContext as that might be the issue
      if (audioContext && audioContext.state === 'suspended') {
        await audioContext.resume();
        console.log('[HowlerPlayer] AudioContext resumed');
        
        // Try playing again after resuming
        await howl.play(id);
        
        // Update state to reflect playing status
        setIsPlaying(true);
        return true;
      }
    } catch (error) {
      const errObj = handleErrors(error);
      
      // Special handling for AbortError - common during rapid play/pause
      if (errObj && errObj.name === 'AbortError') {
        console.log('[HowlerPlayer] AbortError detected - ignoring as this is expected with rapid interactions');
      } else {
        // Log the error for debugging
        console.error('[HowlerPlayer] Error resuming AudioContext:', errObj.message);
      }
    }

    // If the AudioContext couldn't be resumed, or it wasn't the issue, return false
    setPlaybackErrors(prev => ({ ...prev, howlerError: `Playback failed: ${error}` }));
    return false;
  };

  return {
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    playbackRate,
    playbackErrors,
    metadata,
    isLoading,
    isReady,
    handlePlayPause,
    handleSeek,
    handleSkip,
    handleToggleMute,
    handleVolumeChange,
    handleVolumeUp,
    handleVolumeDown,
    handlePlaybackRateChange,
    setIsPlaying
  };
};
