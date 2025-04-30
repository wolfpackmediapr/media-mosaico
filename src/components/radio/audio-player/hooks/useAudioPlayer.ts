
import { useState, useEffect, useRef } from "react";
import { Howl, Howler } from "howler";
import { toast } from "sonner";

interface AudioFile extends File {
  preview?: string;
  remoteUrl?: string;
}

interface AudioPlayerOptions {
  file?: AudioFile;
  onEnded?: () => void;
  onError?: (error: string) => void;
  preservePlaybackOnBlur?: boolean;
  resumeOnFocus?: boolean;
}

export const useAudioPlayer = ({
  file,
  onEnded,
  onError,
  preservePlaybackOnBlur = false,
  resumeOnFocus = false
}: AudioPlayerOptions = {}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState<number[]>([50]);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [audioError, setAudioError] = useState<string | null>(null);
  
  const howler = useRef<Howl | null>(null);
  const progressInterval = useRef<number | null>(null);
  const wasPlayingBeforeBlur = useRef<boolean>(false);
  
  const getAudioSrc = (file?: AudioFile): string | undefined => {
    if (!file) return undefined;
    
    // Prefer remote URL if available
    if (file.remoteUrl) {
      console.log("[AudioPlayer] Using remote URL:", file.remoteUrl);
      return file.remoteUrl;
    }
    
    // Fall back to local preview
    if (file.preview) {
      console.log("[AudioPlayer] Using local preview URL:", file.preview);
      return file.preview;
    }
    
    // Return undefined if no source is available
    console.warn("[AudioPlayer] No audio source available for file:", file.name);
    return undefined;
  };
  
  // Clean up any running intervals
  const cleanupIntervals = () => {
    if (progressInterval.current) {
      console.info("[AudioPlayer] Clearing progress interval");
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
  };
  
  // Initialize or update the Howl instance when file changes
  useEffect(() => {
    try {
      // Clean up previous Howl instance and intervals
      if (howler.current) {
        console.info("[AudioPlayer] Unloading previous audio file");
        howler.current.unload();
      }
      
      cleanupIntervals();
      
      // Reset state
      setCurrentTime(0);
      setDuration(0);
      setIsPlaying(false);
      setAudioError(null);
      
      // If no file, nothing to do
      if (!file) {
        console.info("[AudioPlayer] No file provided");
        return;
      }
      
      // Get audio source
      const audioSrc = getAudioSrc(file);
      if (!audioSrc) {
        console.error("[AudioPlayer] No audio source available");
        setAudioError("No audio source available");
        if (onError) onError("No audio source available");
        return;
      }
      
      // Create new Howl instance
      const sound = new Howl({
        src: [audioSrc],
        html5: true, // Enable streaming for large files
        preload: true,
        volume: volume[0] / 100,
        rate: playbackRate,
        onload: () => {
          console.info("[AudioPlayer] Audio loaded successfully");
          setDuration(sound.duration());
        },
        onloaderror: (soundId, error) => {
          console.error("[AudioPlayer] Error loading audio:", error);
          setAudioError(`Error loading audio: ${error}`);
          if (onError) onError(`Error loading audio: ${error}`);
          toast.error("Error cargando audio", {
            description: "No se pudo cargar el archivo de audio"
          });
        },
        onplayerror: (soundId, error) => {
          console.error("[AudioPlayer] Error playing audio:", error);
          setAudioError(`Error playing audio: ${error}`);
          if (onError) onError(`Error playing audio: ${error}`);
          setIsPlaying(false);
          toast.error("Error reproduciendo audio", {
            description: "No se pudo reproducir el archivo de audio"
          });
        },
        onplay: () => {
          console.info("[AudioPlayer] Event: playing");
          setIsPlaying(true);
          
          // Start progress interval
          if (!progressInterval.current) {
            console.info("[AudioPlayer] Starting progress interval");
            progressInterval.current = window.setInterval(() => {
              if (sound && sound.playing()) {
                setCurrentTime(sound.seek());
              }
            }, 100) as unknown as number;
          }
        },
        onpause: () => {
          console.info("[AudioPlayer] Event: paused");
          setIsPlaying(false);
          cleanupIntervals();
        },
        onstop: () => {
          console.info("[AudioPlayer] Event: stopped");
          setIsPlaying(false);
          cleanupIntervals();
        },
        onend: () => {
          console.info("[AudioPlayer] Event: ended");
          setIsPlaying(false);
          cleanupIntervals();
          if (onEnded) onEnded();
        },
        onseek: () => {
          console.info("[AudioPlayer] Event: seeked to", sound.seek());
          setCurrentTime(sound.seek());
        },
        oncanplay: () => {
          console.info(`[AudioPlayer] Event: canplay. ReadyState: ${sound.state()}`);
          // Try to restore last position for streaming audio
          if (currentTime > 0) {
            console.info(`[AudioPlayer] Restoring position on canplay: ${currentTime}s`);
            sound.seek(currentTime);
          }
        }
      });
      
      howler.current = sound;
      
      return () => {
        cleanupIntervals();
        sound.unload();
      };
    } catch (error) {
      console.error("[AudioPlayer] Error initializing audio player:", error);
      setAudioError(`Error initializing audio: ${error}`);
      if (onError) onError(`Error initializing audio: ${error}`);
    }
  }, [file, volume, playbackRate, onEnded, onError]);
  
  // Update volume when changed
  useEffect(() => {
    if (howler.current) {
      howler.current.volume(volume[0] / 100);
    }
  }, [volume]);
  
  // Update mute state
  useEffect(() => {
    if (howler.current) {
      howler.current.mute(isMuted);
    }
  }, [isMuted]);
  
  // Update playback rate when changed
  useEffect(() => {
    if (howler.current) {
      howler.current.rate(playbackRate);
    }
  }, [playbackRate]);
  
  // Handle document visibility changes for auto-pause/resume
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!howler.current) return;
      
      if (document.hidden) {
        // Tab is hidden
        wasPlayingBeforeBlur.current = isPlaying;
        
        // Auto-pause when tab is hidden if preserve option is not enabled
        if (isPlaying && !preservePlaybackOnBlur) {
          console.info("[AudioPlayer] Auto-pausing due to tab being hidden");
          howler.current.pause();
        }
      } else {
        // Tab is visible again
        // Auto-resume if it was playing before and resume option is enabled
        if (wasPlayingBeforeBlur.current && resumeOnFocus) {
          console.info("[AudioPlayer] Auto-resuming playback after tab is visible");
          if (howler.current.state() === 'loaded') {
            howler.current.play();
          }
        }
      }
    };
    
    document.addEventListener("visibilitychange", handleVisibilityChange);
    
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isPlaying, preservePlaybackOnBlur, resumeOnFocus]);
  
  // Handle page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Clean up to prevent memory leaks
      cleanupIntervals();
      if (howler.current) {
        howler.current.unload();
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      handleBeforeUnload();
    };
  }, []);
  
  // Play/pause toggle
  const handlePlayPause = () => {
    if (!howler.current) return;
    
    if (isPlaying) {
      howler.current.pause();
    } else {
      howler.current.play();
    }
  };
  
  // Seek to specific time
  const handleSeek = (time: number) => {
    if (!howler.current) return;
    
    howler.current.seek(time);
    setCurrentTime(time);
  };
  
  // Skip forward or backward
  const handleSkip = (direction: 'forward' | 'backward', amount: number = 10) => {
    if (!howler.current) return;
    
    const currentPos = howler.current.seek() as number;
    const newTime = direction === 'forward' 
      ? Math.min(currentPos + amount, duration)
      : Math.max(0, currentPos - amount);
    
    howler.current.seek(newTime);
    setCurrentTime(newTime);
  };
  
  // Toggle mute
  const handleToggleMute = () => {
    setIsMuted(!isMuted);
  };
  
  // Change volume
  const handleVolumeChange = (newVolume: number[]) => {
    setVolume(newVolume);
  };
  
  // Change playback rate
  const handlePlaybackRateChange = () => {
    // Cycle through common playback rates
    const rates = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
    const currentIndex = rates.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % rates.length;
    setPlaybackRate(rates[nextIndex]);
  };
  
  // Seek to specific timestamp (ms to seconds)
  const seekToTimestamp = (timeMs: number) => {
    const timeInSeconds = timeMs / 1000;
    handleSeek(timeInSeconds);
    
    // Auto-play after seeking to a timestamp
    if (!isPlaying && howler.current) {
      howler.current.play();
    }
  };

  return {
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    playbackRate,
    audioError,
    handlePlayPause,
    handleSeek,
    handleSkip,
    handleToggleMute,
    handleVolumeChange,
    handlePlaybackRateChange,
    seekToTimestamp
  };
};
