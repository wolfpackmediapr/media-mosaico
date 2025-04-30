
import { useState, useEffect, useRef, useCallback } from 'react';
import { Howl, Howler } from 'howler';
import { AudioPlayerProps, UseAudioPlayerOptions } from '../types';
import { useMediaPersistence } from "@/context/MediaPersistenceContext"; // Added for persistent volume
import { usePersistentState } from '@/hooks/use-persistent-state'; // To persist volume setting
import { toast } from "sonner"; // For showing errors

const VOLUME_PERSIST_KEY = 'audio-player-volume';
const MUTE_PERSIST_KEY = 'audio-player-mute';

export const useAudioPlayer = ({
  file,
  onEnded,
  preservePlaybackOnBlur = false, // Default to false unless explicitly set
  resumeOnFocus = false, // Default to false
  onError // Callback for reporting errors
}: UseAudioPlayerOptions = {}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [audioError, setAudioError] = useState<string | null>(null);

  // Use persistent state for volume and mute status
  const [volume, setVolume] = usePersistentState<number>(VOLUME_PERSIST_KEY, 50, { storage: 'localStorage' });
  const [isMuted, setIsMuted] = usePersistentState<boolean>(MUTE_PERSIST_KEY, false, { storage: 'localStorage' });

  const howlRef = useRef<Howl | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const seekTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const wasPlayingBeforeBlur = useRef(false);

  // Function to handle errors consistently
  const handleError = useCallback((message: string, error?: any) => {
    console.error(`[useAudioPlayer] Error: ${message}`, error || '');
    setAudioError(message);
    setIsPlaying(false); // Stop playback on error
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (seekTimeoutRef.current) clearTimeout(seekTimeoutRef.current);
    // Use the onError callback if provided
    if (onError) {
      onError(message);
    } else {
      // Fallback toast if no callback is provided
      toast.error("Audio Playback Error", { description: message });
    }
  }, [onError]);


  useEffect(() => {
    // Cleanup function
    const cleanup = () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (seekTimeoutRef.current) clearTimeout(seekTimeoutRef.current);
      if (howlRef.current) {
        howlRef.current.unload(); // Unload previous sound
        howlRef.current = null;
      }
      // Reset state for new file
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      setAudioError(null); // Reset error state
    };

    cleanup(); // Clean up before setting new file

    if (file) {
      const src = file.remoteUrl || file.preview;
      if (!src) {
        handleError("No valid source URL found for the audio file", file.name);
        return;
      }

      // Determine format based on file type or name if using blob URL
      let formats: string[] | undefined = undefined;
      if (src.startsWith('blob:')) {
        const extension = file.name.split('.').pop()?.toLowerCase();
        if (extension) {
          formats = [extension]; // e.g., ['mp3']
        } else if (file.type === 'audio/mpeg') {
          formats = ['mp3'];
        } else if (file.type === 'audio/wav' || file.type === 'audio/wave') {
          formats = ['wav'];
        } else if (file.type === 'audio/ogg') {
           formats = ['ogg'];
        } else if (file.type === 'audio/mp4' || file.type === 'audio/x-m4a') { // Common types for m4a
           formats = ['m4a'];
        } else {
           // If type is unknown or missing, try common formats
           console.warn("[useAudioPlayer] Could not determine format from blob URL type/name. Falling back to common formats.");
           formats = ['mp3', 'wav', 'ogg', 'm4a'];
        }
        console.log(`[useAudioPlayer] Using format(s) for blob URL: ${formats.join(', ')}`);
      }

      const newHowl = new Howl({
        src: [src],
        format: formats, // Pass determined format(s)
        html5: true, // Use HTML5 Audio to potentially improve blob/seeking support
        volume: isMuted ? 0 : volume / 100, // Apply initial volume/mute state
        rate: playbackRate,
        // Removed mute: isMuted here as volume is set directly
        onload: () => {
          if (newHowl) {
            setDuration(newHowl.duration());
            setAudioError(null); // Clear error on successful load
          }
        },
        onplay: () => {
          setIsPlaying(true);
          setAudioError(null); // Clear error on successful play
          if (intervalRef.current) clearInterval(intervalRef.current);
          intervalRef.current = setInterval(() => {
            if (howlRef.current) {
              const current = howlRef.current.seek();
              // Ensure 'current' is a number before setting state
              if (typeof current === 'number') {
                 setCurrentTime(current);
              }
            }
          }, 100);
        },
        onpause: () => {
          setIsPlaying(false);
          if (intervalRef.current) clearInterval(intervalRef.current);
        },
        onend: () => {
          setIsPlaying(false);
          setCurrentTime(0); // Reset time on end
          if (intervalRef.current) clearInterval(intervalRef.current);
          if (onEnded) onEnded();
        },
        onseek: () => {
          // Update current time immediately on seek
           if (howlRef.current) {
             const current = howlRef.current.seek();
             if (typeof current === 'number') {
               // Debounce state update slightly to avoid rapid updates during drag
               if (seekTimeoutRef.current) clearTimeout(seekTimeoutRef.current);
               seekTimeoutRef.current = setTimeout(() => setCurrentTime(current), 50);
             }
           }
        },
        onloaderror: (id, err) => {
          // More specific error for load issues
          handleError(`Failed to load audio: ${err}`, `Howler ID: ${id}`);
        },
        onplayerror: (id, err) => {
          // More specific error for playback issues
          handleError(`Playback failed: ${err}`, `Howler ID: ${id}`);
        },
      });

      howlRef.current = newHowl;
    }

    // Return cleanup function
    return cleanup;
  }, [file, onEnded, handleError]); // Added handleError to dependency array

  // Handle browser tab visibility changes for pause/resume
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!howlRef.current) return;

      if (document.hidden) {
        if (isPlaying) {
          wasPlayingBeforeBlur.current = true;
          if (!preservePlaybackOnBlur) {
            console.log("[useAudioPlayer] Tab hidden, pausing playback.");
            howlRef.current.pause();
          } else {
            console.log("[useAudioPlayer] Tab hidden, preserving playback.");
          }
        } else {
          wasPlayingBeforeBlur.current = false;
        }
      } else {
        // Tab became visible
        if (wasPlayingBeforeBlur.current && resumeOnFocus) {
          console.log("[useAudioPlayer] Tab visible, resuming playback.");
          // Check if audio is ready and not already playing due to preservePlaybackOnBlur
          if (howlRef.current.state() === 'loaded' && !isPlaying) {
             // Small delay might help ensure context is ready
             setTimeout(() => {
               if (howlRef.current && !audioError) { // Check for errors before resuming
                 howlRef.current.play();
               }
             }, 100);
          }
        }
        wasPlayingBeforeBlur.current = false; // Reset flag
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isPlaying, preservePlaybackOnBlur, resumeOnFocus, audioError]); // Added audioError dependency


  const handlePlayPause = useCallback(() => {
    if (!howlRef.current) {
      handleError("Audio not loaded yet.");
      return;
    }
    if (audioError) {
       handleError("Cannot play due to previous error. Please try reloading or using a different file.");
       return; // Don't attempt to play if there's an error
    }

    if (isPlaying) {
      howlRef.current.pause();
    } else {
       // Check if ready before playing
       if (howlRef.current.state() === 'loaded') {
         howlRef.current.play();
       } else {
         handleError("Audio is still loading or failed to load.");
         // Optionally try loading again?
         // howlRef.current.load();
       }
    }
  }, [isPlaying, audioError, handleError]);


  const handleSeek = useCallback((time: number) => {
    if (howlRef.current && duration > 0) {
      const seekTime = Math.max(0, Math.min(time, duration));
      howlRef.current.seek(seekTime);
      // setCurrentTime(seekTime); // Update time immediately for responsiveness
    }
  }, [duration]);

  const handleSkip = useCallback((direction: 'forward' | 'backward', amount: number = 10) => {
    if (howlRef.current) {
      const current = typeof howlRef.current.seek() === 'number' ? howlRef.current.seek() as number : currentTime;
      let newTime;
      if (direction === 'forward') {
        newTime = Math.min(duration, current + amount);
      } else {
        newTime = Math.max(0, current - amount);
      }
      handleSeek(newTime);
    }
  }, [currentTime, duration, handleSeek]);

  const handleToggleMute = useCallback(() => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState); // Update persistent state
    Howler.mute(newMutedState); // Use global mute as well for consistency
    // Also adjust instance volume if needed, though Howler.mute usually suffices
    // if (howlRef.current) {
    //   howlRef.current.mute(newMutedState);
    // }
  }, [isMuted, setIsMuted]);

  const handleVolumeChange = useCallback((value: number) => {
    const newVolume = Math.max(0, Math.min(value, 100));
    setVolume(newVolume); // Update persistent state
    Howler.volume(newVolume / 100); // Set global volume
    // Also update instance volume if managing individually
    // if (howlRef.current) {
    //   howlRef.current.volume(newVolume / 100);
    // }
    // If volume is > 0, ensure not muted
    if (newVolume > 0 && isMuted) {
      setIsMuted(false);
      Howler.mute(false);
      // if (howlRef.current) howlRef.current.mute(false);
    } else if (newVolume === 0 && !isMuted) {
      // If volume is set to 0, also set mute state
      setIsMuted(true);
      Howler.mute(true);
      // if (howlRef.current) howlRef.current.mute(true);
    }
  }, [isMuted, setVolume, setIsMuted]);

  const handlePlaybackRateChange = useCallback(() => {
    if (howlRef.current) {
      const rates = [1, 1.25, 1.5, 2, 0.75];
      const currentIndex = rates.indexOf(playbackRate);
      const nextIndex = (currentIndex + 1) % rates.length;
      const newRate = rates[nextIndex];
      setPlaybackRate(newRate);
      howlRef.current.rate(newRate);
    }
  }, [playbackRate]);

  // Function to seek to a specific timestamp (useful for segments)
  const seekToTimestamp = useCallback((timeInSeconds: number) => {
    if (howlRef.current && howlRef.current.state() === 'loaded') {
      handleSeek(timeInSeconds);
      // Optionally start playing if not already
      if (!isPlaying) {
        // Small delay before playing after seek
        setTimeout(() => {
           if (howlRef.current && !audioError) howlRef.current.play();
        }, 50);
      }
    } else if (!howlRef.current || howlRef.current.state() !== 'loaded') {
      handleError("Cannot seek: audio not loaded yet.");
    }
  }, [handleSeek, isPlaying, audioError, handleError]);


  // Ensure volume and mute status from storage are applied on initial load
  useEffect(() => {
     Howler.volume(volume / 100);
     Howler.mute(isMuted);
  }, []); // Run only once on mount

  // Sync Howler's state if global volume/mute changes elsewhere
   useEffect(() => {
     const currentGlobalVolume = Howler.volume();
     const currentGlobalMute = Howler.mute();

     if (currentGlobalVolume !== volume / 100) {
       setVolume(currentGlobalVolume * 100);
     }
     if (currentGlobalMute !== isMuted) {
       setIsMuted(currentGlobalMute);
     }

     // Listener for external changes (less direct way, might not be needed if using global)
     // const volumeListener = () => setVolume(Howler.volume() * 100);
     // Howler.on('volume', volumeListener);
     // return () => Howler.off('volume', volumeListener);

   }, [volume, isMuted, setVolume, setIsMuted]);


  return {
    isPlaying,
    currentTime,
    duration,
    volume: volume, // Return the state value
    isMuted: isMuted, // Return the state value
    playbackRate,
    audioError, // Expose error state
    handlePlayPause,
    handleSeek,
    handleSkip,
    handleToggleMute,
    handleVolumeChange: (newVolume: number | number[]) => { // Adapt to slider returning array or number
       handleVolumeChange(Array.isArray(newVolume) ? newVolume[0] : newVolume);
    },
    handlePlaybackRateChange,
    seekToTimestamp // Expose seek function
  };
};

