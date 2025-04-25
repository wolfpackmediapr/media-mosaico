import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";

interface UploadedFile extends File {
  preview?: string;
}

interface AudioPlayerOptions {
  file?: UploadedFile;
  onTimeUpdate?: (time: number) => void;
  onDurationChange?: (duration: number) => void;
  preservePlaybackOnBlur?: boolean;
  resumeOnFocus?: boolean;
}

export const useAudioPlayer = ({ 
  file, 
  onTimeUpdate, 
  onDurationChange,
  preservePlaybackOnBlur = true,
  resumeOnFocus = true
}: AudioPlayerOptions = {}) => {
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState<number[]>([50]);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const wasPlayingBeforeBlur = useRef<boolean>(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);

  useEffect(() => {
    if (!file) return;

    // Clean up previous audio element
    if (audioElement) {
      audioElement.pause();
      URL.revokeObjectURL(audioElement.src);
      
      // Clean up any audio context and nodes
      if (sourceNodeRef.current) {
        sourceNodeRef.current.disconnect();
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    }

    // Create a URL from the file if it's not already a URL
    const fileUrl = file.preview || URL.createObjectURL(file);
    
    const audio = new Audio(fileUrl);
    
    audio.onloadedmetadata = () => {
      setDuration(audio.duration);
      if (onDurationChange) {
        onDurationChange(audio.duration);
      }
    };
    
    audio.ontimeupdate = () => {
      setCurrentTime(audio.currentTime);
      if (onTimeUpdate) {
        onTimeUpdate(audio.currentTime);
      }
    };
    
    audio.onended = () => {
      setIsPlaying(false);
    };
    
    audio.volume = volume[0] / 100;
    audio.muted = isMuted;
    audio.playbackRate = playbackRate;
    
    // Create a webAudio context to keep sound playing in background tabs
    if (preservePlaybackOnBlur) {
      try {
        // Create AudioContext only on user interaction
        const createAudioContext = () => {
          if (!audioContextRef.current) {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioContext) {
              audioContextRef.current = new AudioContext();
              sourceNodeRef.current = audioContextRef.current.createMediaElementSource(audio);
              sourceNodeRef.current.connect(audioContextRef.current.destination);
              
              // Remove the event listener once AudioContext is created
              document.removeEventListener('click', createAudioContext);
            }
          }
        };
        
        // Add event listener for user interaction
        document.addEventListener('click', createAudioContext, { once: true });
      } catch (e) {
        console.error("Error creating AudioContext:", e);
      }
    }
    
    setAudioElement(audio);
    
    return () => {
      audio.pause();
      // Only revoke if we created the URL, not if we're using a preview
      if (!file.preview) {
        URL.revokeObjectURL(fileUrl);
      }
      
      // Clean up event listeners and audio context
      if (sourceNodeRef.current) {
        sourceNodeRef.current.disconnect();
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, [file, onTimeUpdate, onDurationChange]);

  // Handle visibility change events for background tab playback
  useEffect(() => {
    if (!preservePlaybackOnBlur || !resumeOnFocus) return;
    
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab is now hidden
        wasPlayingBeforeBlur.current = isPlaying;
        console.log("[useAudioPlayer] Tab hidden, was playing:", isPlaying);
        
        // Make sure the audio context is running if it exists
        if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume().catch(e => {
            console.warn("Could not resume audio context:", e);
          });
        }
      } else if (resumeOnFocus) {
        // Tab is now visible
        console.log("[useAudioPlayer] Tab visible, was playing:", wasPlayingBeforeBlur.current);
        
        // If we were playing before and we have an audio element, ensure it's still playing
        if (wasPlayingBeforeBlur.current && audioElement && audioElement.paused) {
          console.log("[useAudioPlayer] Resuming playback after tab visible");
          audioElement.play().catch(e => {
            console.warn("Could not resume audio after visibility change:", e);
          });
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isPlaying, audioElement, preservePlaybackOnBlur, resumeOnFocus]);

  // Reset state when file changes
  useEffect(() => {
    if (file) {
      setCurrentTime(0);
      setIsPlaying(false);
    }
  }, [file]);

  const handlePlayPause = () => {
    if (!audioElement) return;
    
    if (isPlaying) {
      audioElement.pause();
    } else {
      // Resume AudioContext if it's suspended (needed after user interaction)
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume().catch(e => {
          console.warn("Could not resume audio context:", e);
        });
      }
      
      audioElement.play().catch(error => {
        console.error("Error playing audio:", error);
        toast.error("Error al reproducir el audio");
      });
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (seconds: number) => {
    if (!audioElement) return;
    audioElement.currentTime = seconds;
    setCurrentTime(seconds);
  };

  const handleSkip = (direction: 'forward' | 'backward', amount: number = 10) => {
    if (!audioElement) return;
    
    const newTime = direction === 'forward' 
      ? Math.min(audioElement.duration, audioElement.currentTime + amount)
      : Math.max(0, audioElement.currentTime - amount);
      
    audioElement.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleToggleMute = () => {
    if (!audioElement) return;
    
    audioElement.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (newVolume: number[]) => {
    if (!audioElement) return;
    
    audioElement.volume = newVolume[0] / 100;
    setVolume(newVolume);
    
    if (newVolume[0] === 0) {
      setIsMuted(true);
      audioElement.muted = true;
    } else if (isMuted) {
      setIsMuted(false);
      audioElement.muted = false;
    }
  };

  const handlePlaybackRateChange = () => {
    if (!audioElement) return;
    
    const rates = [0.5, 1.0, 1.5, 2.0];
    const currentIndex = rates.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % rates.length;
    const newRate = rates[nextIndex];
    
    audioElement.playbackRate = newRate;
    setPlaybackRate(newRate);
    toast.info(`Velocidad: ${newRate}x`);
  };

  // Update the seekToTimestamp function to properly handle both milliseconds and seconds
  const seekToTimestamp = (timestamp: number) => {
    if (audioElement) {
      // Check if the timestamp is in milliseconds (large number) and convert to seconds if needed
      const targetSeconds = timestamp > 1000 ? timestamp / 1000 : timestamp;
      
      console.log(`Seeking to timestamp: ${timestamp}, converted to seconds: ${targetSeconds}`);
      
      audioElement.currentTime = targetSeconds;
      
      // Resume AudioContext if needed
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume().catch(e => {
          console.warn("Could not resume audio context:", e);
        });
      }
      
      audioElement.play().catch(error => {
        console.error("Error playing audio after seeking:", error);
        toast.error("Error al reproducir el audio después de buscar");
      });
      setIsPlaying(true);
    } else {
      console.warn('No audio element found to seek');
    }
  };

  return {
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    playbackRate,
    handlePlayPause,
    handleSeek,
    handleSkip,
    handleToggleMute,
    handleVolumeChange,
    handlePlaybackRateChange,
    seekToTimestamp,
  };
};
