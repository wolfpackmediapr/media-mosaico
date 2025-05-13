
import { useState, useEffect, useRef, useCallback } from "react";
import { Howl } from "howler";
import { UploadedFile } from "@/components/radio/types";
import { RadioNewsSegment } from "@/components/radio/RadioNewsSegmentsContainer";
import { toast } from "sonner";

interface AudioProcessingOptions {
  currentFile: UploadedFile | null;
  isActiveMediaRoute?: boolean;
  externalIsPlaying?: boolean;
  onPlayingChange?: (isPlaying: boolean) => void;
  preferNativeAudio?: boolean;
}

export const useAudioProcessing = ({
  currentFile,
  isActiveMediaRoute = true,
  externalIsPlaying = false,
  onPlayingChange = () => {},
  preferNativeAudio = false
}: AudioProcessingOptions) => {
  // Audio state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState([75]); // Default volume
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [playbackErrors, setPlaybackErrors] = useState<string | null>(null);
  const [isUsingNativeAudio, setIsUsingNativeAudio] = useState(preferNativeAudio);
  
  // Refs
  const howlerRef = useRef<Howl | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const urlRef = useRef<string | null>(null);

  // Create audio elements based on player type
  useEffect(() => {
    // If no file is present, clean up and exit
    if (!currentFile || !currentFile.preview) {
      // Clean up existing audio elements
      if (howlerRef.current) {
        howlerRef.current.unload();
        howlerRef.current = null;
      }
      
      if (audioRef.current) {
        audioRef.current.src = '';
        audioRef.current.load();
      }
      
      // Reset state
      setDuration(0);
      setCurrentTime(0);
      setIsPlaying(false);
      setPlaybackErrors(null);
      
      // Clear animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      
      return;
    }

    // Save URL reference
    urlRef.current = currentFile.preview;
    
    // Reset error state when changing files
    setPlaybackErrors(null);
    
    try {
      if (isUsingNativeAudio) {
        // Use native audio element
        setupNativeAudio(currentFile.preview);
      } else {
        // Use Howler
        setupHowlerAudio(currentFile.preview);
      }
    } catch (error) {
      console.error("Error setting up audio:", error);
      setPlaybackErrors(`Error initializing audio: ${error}`);
    }
    
    // Clean up on unmount
    return () => {
      if (howlerRef.current) {
        howlerRef.current.unload();
      }
      
      if (audioRef.current) {
        audioRef.current.src = '';
        audioRef.current.load();
      }
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [currentFile, isUsingNativeAudio]);

  // Setup native audio element
  const setupNativeAudio = useCallback((fileUrl: string) => {
    // Create or reuse audio element
    if (!audioRef.current) {
      audioRef.current = new Audio();
      
      // Set up event listeners
      audioRef.current.addEventListener('timeupdate', () => {
        if (audioRef.current) {
          setCurrentTime(audioRef.current.currentTime);
        }
      });
      
      audioRef.current.addEventListener('durationchange', () => {
        if (audioRef.current) {
          setDuration(audioRef.current.duration);
        }
      });
      
      audioRef.current.addEventListener('ended', () => {
        setIsPlaying(false);
        onPlayingChange(false);
      });
      
      audioRef.current.addEventListener('error', (e) => {
        const error = e.currentTarget as HTMLAudioElement;
        let message = "Unknown audio error";
        
        if (error.error) {
          message = `Audio error: ${error.error.message}`;
        }
        
        setPlaybackErrors(message);
        setIsPlaying(false);
        onPlayingChange(false);
      });
    }
    
    // Set source and load
    audioRef.current.src = fileUrl;
    audioRef.current.load();
    
    // Apply playback settings
    audioRef.current.volume = Array.isArray(volume) ? volume[0] / 100 : volume / 100;
    audioRef.current.muted = isMuted;
    audioRef.current.playbackRate = playbackRate;
    
    // Update duration once metadata is loaded
    audioRef.current.addEventListener('loadedmetadata', () => {
      if (audioRef.current) {
        setDuration(audioRef.current.duration);
      }
    });
  }, [volume, isMuted, playbackRate, onPlayingChange]);

  // Setup Howler audio player
  const setupHowlerAudio = useCallback((fileUrl: string) => {
    // Unload any existing Howl instance
    if (howlerRef.current) {
      howlerRef.current.unload();
    }
    
    // Create new Howl instance
    const sound = new Howl({
      src: [fileUrl],
      html5: true, // Important for streamed audio
      preload: true,
      format: ['mp3', 'wav', 'aac'],
      volume: Array.isArray(volume) ? volume[0] / 100 : volume / 100,
      rate: playbackRate,
      onload: () => {
        setDuration(sound.duration());
      },
      onplay: () => {
        setIsPlaying(true);
        onPlayingChange(true);
        updateProgressLoop();
      },
      onpause: () => {
        setIsPlaying(false);
        onPlayingChange(false);
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
      },
      onstop: () => {
        setIsPlaying(false);
        onPlayingChange(false);
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
      },
      onend: () => {
        setIsPlaying(false);
        onPlayingChange(false);
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
      },
      onloaderror: () => {
        setPlaybackErrors("Error loading audio file");
        setIsPlaying(false);
        onPlayingChange(false);
      },
      onplayerror: () => {
        setPlaybackErrors("Error playing audio file");
        setIsPlaying(false);
        onPlayingChange(false);
      }
    });
    
    // Store reference
    howlerRef.current = sound;
  }, [volume, playbackRate, onPlayingChange]);

  // External play state sync
  useEffect(() => {
    if (!isActiveMediaRoute) return;
    
    // Only sync if state is different
    if (externalIsPlaying !== isPlaying) {
      handlePlayPause();
    }
  }, [externalIsPlaying, isActiveMediaRoute]);

  // Progress update loop for Howler
  const updateProgressLoop = useCallback(() => {
    if (howlerRef.current && isPlaying) {
      setCurrentTime(howlerRef.current.seek() as number);
      animationFrameRef.current = requestAnimationFrame(updateProgressLoop);
    }
  }, [isPlaying]);

  // Handler functions
  const handlePlayPause = useCallback(() => {
    if (!currentFile) return;
    
    try {
      if (isUsingNativeAudio && audioRef.current) {
        if (isPlaying) {
          audioRef.current.pause();
        } else {
          audioRef.current.play()
            .catch(error => {
              console.error("Native audio play error:", error);
              setPlaybackErrors(`Error playing audio: ${error.message}`);
            });
        }
        setIsPlaying(!isPlaying);
        onPlayingChange(!isPlaying);
      } else if (howlerRef.current) {
        if (isPlaying) {
          howlerRef.current.pause();
        } else {
          howlerRef.current.play();
        }
      }
    } catch (error) {
      console.error("Error toggling playback:", error);
      setPlaybackErrors(`Error toggling playback: ${error}`);
    }
  }, [currentFile, isPlaying, isUsingNativeAudio, onPlayingChange]);

  const handleSeek = useCallback((time: number) => {
    if (!currentFile) return;
    
    try {
      if (isUsingNativeAudio && audioRef.current) {
        audioRef.current.currentTime = time;
        setCurrentTime(time);
      } else if (howlerRef.current) {
        howlerRef.current.seek(time);
        setCurrentTime(time);
      }
    } catch (error) {
      console.error("Error seeking:", error);
      setPlaybackErrors(`Error seeking: ${error}`);
    }
  }, [currentFile, isUsingNativeAudio]);

  const handleSkip = useCallback((direction: 'forward' | 'backward', amount = 5) => {
    if (!currentFile) return;
    
    try {
      const skipAmount = direction === 'forward' ? amount : -amount;
      const newTime = Math.max(0, Math.min(duration, currentTime + skipAmount));
      
      handleSeek(newTime);
    } catch (error) {
      console.error("Error skipping:", error);
      setPlaybackErrors(`Error skipping: ${error}`);
    }
  }, [currentFile, currentTime, duration, handleSeek]);

  const handleToggleMute = useCallback(() => {
    try {
      if (isUsingNativeAudio && audioRef.current) {
        audioRef.current.muted = !isMuted;
      } else if (howlerRef.current) {
        howlerRef.current.mute(!isMuted);
      }
      
      setIsMuted(!isMuted);
    } catch (error) {
      console.error("Error toggling mute:", error);
      setPlaybackErrors(`Error toggling mute: ${error}`);
    }
  }, [isMuted, isUsingNativeAudio]);

  const handleVolumeChange = useCallback((newVolume: number[]) => {
    try {
      const volumeValue = newVolume[0] / 100;
      
      if (isUsingNativeAudio && audioRef.current) {
        audioRef.current.volume = volumeValue;
      } else if (howlerRef.current) {
        howlerRef.current.volume(volumeValue);
      }
      
      setVolume(newVolume);
    } catch (error) {
      console.error("Error changing volume:", error);
      setPlaybackErrors(`Error changing volume: ${error}`);
    }
  }, [isUsingNativeAudio]);

  const handlePlaybackRateChange = useCallback((rate: number) => {
    try {
      if (isUsingNativeAudio && audioRef.current) {
        audioRef.current.playbackRate = rate;
      } else if (howlerRef.current) {
        howlerRef.current.rate(rate);
      }
      
      setPlaybackRate(rate);
    } catch (error) {
      console.error("Error changing playback rate:", error);
      setPlaybackErrors(`Error changing playback rate: ${error}`);
    }
  }, [isUsingNativeAudio]);

  const handleSeekToSegment = useCallback((segment: RadioNewsSegment) => {
    if (!segment || !segment.startTime) return;
    
    try {
      // Convert milliseconds to seconds if needed
      const timeInSeconds = typeof segment.startTime === 'number' 
        ? segment.startTime > 1000 ? segment.startTime / 1000 : segment.startTime
        : 0;
        
      handleSeek(timeInSeconds);
      
      // Auto-play if not already playing
      if (!isPlaying) {
        handlePlayPause();
      }
    } catch (error) {
      console.error("Error seeking to segment:", error);
      setPlaybackErrors(`Error seeking to segment: ${error}`);
    }
  }, [handleSeek, isPlaying, handlePlayPause]);

  // Switch between audio players
  const switchToNativeAudio = useCallback(() => {
    if (isUsingNativeAudio) return;
    
    // Remember current time and playing state
    const wasPlaying = isPlaying;
    const currentPos = currentTime;
    
    setIsUsingNativeAudio(true);
    
    // Restore state after switching
    setTimeout(() => {
      handleSeek(currentPos);
      if (wasPlaying) {
        handlePlayPause();
      }
    }, 100);
    
    toast.success("Cambiado a reproductor nativo");
  }, [isUsingNativeAudio, isPlaying, currentTime, handleSeek, handlePlayPause]);

  const switchToHowler = useCallback(() => {
    if (!isUsingNativeAudio) return;
    
    // Remember current time and playing state
    const wasPlaying = isPlaying;
    const currentPos = currentTime;
    
    setIsUsingNativeAudio(false);
    
    // Restore state after switching
    setTimeout(() => {
      handleSeek(currentPos);
      if (wasPlaying) {
        handlePlayPause();
      }
    }, 100);
    
    toast.success("Cambiado a reproductor Howler");
  }, [isUsingNativeAudio, isPlaying, currentTime, handleSeek, handlePlayPause]);

  return {
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    playbackRate,
    playbackErrors,
    isUsingNativeAudio,
    handlePlayPause,
    handleSeek,
    handleSkip,
    handleToggleMute,
    handleVolumeChange,
    handlePlaybackRateChange,
    handleSeekToSegment,
    switchToNativeAudio,
    switchToHowler,
  };
};
