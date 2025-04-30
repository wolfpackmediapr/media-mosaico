
import { useState, useEffect, useRef, useCallback } from 'react';
import { Howl, Howler } from 'howler';
import { UseAudioPlayerOptions } from '../types';
import { usePersistentState } from '@/hooks/use-persistent-state';
import { toast } from "sonner";

const VOLUME_PERSIST_KEY = 'audio-player-volume';
const MUTE_PERSIST_KEY = 'audio-player-mute';

export const useAudioPlayer = ({
  file,
  onEnded,
  preservePlaybackOnBlur = false,
  resumeOnFocus = false,
  onError
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
    if (onError) {
      onError(message);
    } else {
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
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      setAudioError(null);
    };

    cleanup(); // Clean up before setting new file

    if (file) {
      // Determine the audio source - use remoteUrl for remote files, preview for local files
      const src = file.remoteUrl || file.preview;
      
      if (!src) {
        handleError(`No valid source URL found for the audio file${file.name ? `: ${file.name}` : ''}`);
        console.error("[useAudioPlayer] File has no valid source URL:", file);
        return;
      }

      console.log(`[useAudioPlayer] Using source URL: ${src}`);
      
      // Determine formats based on file type and source
      let formats: string[] | undefined = undefined;
      
      // For blob URLs, we need to determine the format from the file type
      if (src.startsWith('blob:')) {
        const extension = file.name?.split('.').pop()?.toLowerCase();
        if (extension) {
          formats = [extension];
        } else if (file.type === 'audio/mpeg') {
          formats = ['mp3'];
        } else if (file.type === 'audio/wav' || file.type === 'audio/wave') {
          formats = ['wav'];
        } else if (file.type === 'audio/ogg') {
          formats = ['ogg'];
        } else if (file.type === 'audio/mp4' || file.type === 'audio/x-m4a') {
          formats = ['m4a'];
        } else {
          console.warn("[useAudioPlayer] Could not determine format from blob URL type/name. Falling back to common formats.");
          formats = ['mp3', 'wav', 'ogg', 'm4a'];
        }
        console.log(`[useAudioPlayer] Using format(s) for blob URL: ${formats?.join(', ') ?? 'Auto-detect'}`);
      } else if (src.includes('supabase')) {
        // For Supabase URLs, let's determine the format from the URL or file extension
        const extension = src.split('.').pop()?.toLowerCase();
        if (extension) {
          formats = [extension];
          console.log(`[useAudioPlayer] Using format for Supabase URL: ${extension}`);
        }
      }

      const newHowl = new Howl({
        src: [src],
        format: formats,
        html5: true, // Force HTML5 Audio to ensure streaming works correctly (esp for remote files)
        volume: isMuted ? 0 : volume / 100,
        rate: playbackRate,
        onload: () => {
          setDuration(newHowl.duration());
          setAudioError(null);
          console.log(`[useAudioPlayer] Successfully loaded audio, duration: ${newHowl.duration()} seconds`);
        },
        onloaderror: (id, err) => {
          const errorMsg = `Failed to load audio: ${err}`;
          console.error(`[useAudioPlayer] Load error for ID ${id}: ${err}`);
          handleError(errorMsg);
        },
        onplayerror: (id, err) => {
          const errorMsg = `Playback failed: ${err}`;
          console.error(`[useAudioPlayer] Play error for ID ${id}: ${err}`);
          handleError(errorMsg);
        },
        onplay: () => {
          setIsPlaying(true);
          setAudioError(null);
          if (intervalRef.current) clearInterval(intervalRef.current);
          intervalRef.current = setInterval(() => {
            if (howlRef.current) {
              const current = howlRef.current.seek();
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
          setCurrentTime(0);
          if (intervalRef.current) clearInterval(intervalRef.current);
          if (onEnded) onEnded();
        },
        onseek: () => {
          if (howlRef.current) {
            const current = howlRef.current.seek();
            if (typeof current === 'number') {
              if (seekTimeoutRef.current) clearTimeout(seekTimeoutRef.current);
              seekTimeoutRef.current = setTimeout(() => setCurrentTime(current), 50);
            }
          }
        }
      });

      howlRef.current = newHowl;
    }

    return cleanup;
  }, [file, onEnded, handleError, isMuted, volume, playbackRate]);

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
        if (wasPlayingBeforeBlur.current && resumeOnFocus) {
          console.log("[useAudioPlayer] Tab visible, resuming playback.");
          if (howlRef.current.state() === 'loaded' && !isPlaying) {
            setTimeout(() => {
              if (howlRef.current && !audioError) {
                howlRef.current.play();
              }
            }, 100);
          }
        }
        wasPlayingBeforeBlur.current = false;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isPlaying, preservePlaybackOnBlur, resumeOnFocus, audioError]);

  const handlePlayPause = useCallback(() => {
    if (!howlRef.current) {
      handleError("Audio not loaded yet.");
      return;
    }
    if (audioError) {
      handleError("Cannot play due to previous error. Please try reloading or using a different file.");
      return;
    }

    if (isPlaying) {
      howlRef.current.pause();
    } else {
      if (howlRef.current.state() === 'loaded') {
        howlRef.current.play();
      } else {
        handleError("Audio is still loading or failed to load.");
      }
    }
  }, [isPlaying, audioError, handleError]);

  const handleSeek = useCallback((time: number) => {
    if (howlRef.current && duration > 0) {
      const seekTime = Math.max(0, Math.min(time, duration));
      howlRef.current.seek(seekTime);
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
    setIsMuted(newMutedState);
    Howler.mute(newMutedState);
    
    // No need to update Howler volume since mute/unmute handles this
    if (howlRef.current) {
      if (newMutedState) {
        howlRef.current.volume(0);
      } else {
        howlRef.current.volume(volume / 100);
      }
    }
  }, [isMuted, setIsMuted, volume]);

  const handleVolumeChange = useCallback((value: number | number[]) => {
    // Extract the single number value regardless of input type
    const newVolumeValue = Array.isArray(value) ? value[0] : value;
    const newVolume = Math.max(0, Math.min(newVolumeValue, 100));
    
    // Update our stored volume state
    setVolume(newVolume);
    
    // Apply volume to current howl instance and global Howler
    if (howlRef.current) {
      howlRef.current.volume(newVolume / 100);
    }
    Howler.volume(newVolume / 100);
    
    // Handle mute state
    if (newVolume > 0 && isMuted) {
      setIsMuted(false);
      Howler.mute(false);
    } else if (newVolume === 0 && !isMuted) {
      setIsMuted(true);
      Howler.mute(true);
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

  const seekToTimestamp = useCallback((timeInSeconds: number) => {
    if (howlRef.current && howlRef.current.state() === 'loaded') {
      handleSeek(timeInSeconds);
      if (!isPlaying) {
        setTimeout(() => {
          if (howlRef.current && !audioError) howlRef.current.play();
        }, 50);
      }
    } else if (!howlRef.current || howlRef.current.state() !== 'loaded') {
      handleError("Cannot seek: audio not loaded yet.");
    }
  }, [handleSeek, isPlaying, audioError, handleError]);

  // Ensure global Howler settings match our component state on mount
  useEffect(() => {
    Howler.volume(volume / 100);
    Howler.mute(isMuted);
  }, []);

  // Sync our state with global Howler state when needed
  useEffect(() => {
    const currentGlobalVolume = Howler.volume();
    const currentGlobalMute = Howler.mute();

    if (Math.abs(currentGlobalVolume - volume / 100) > 0.01) {
      setVolume(currentGlobalVolume * 100);
    }
    if (currentGlobalMute !== isMuted) {
      setIsMuted(currentGlobalMute);
    }
  }, [volume, isMuted, setVolume, setIsMuted]);

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
