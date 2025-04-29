import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useMediaControls } from './useMediaControls';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';
import { validateAudioFile } from '@/utils/file-validation';

interface AudioPlayerOptions {
  file?: File;
  onEnded?: () => void;
  onError?: (error: string) => void;
  preservePlaybackOnBlur?: boolean;
  resumeOnFocus?: boolean;
}

export const useAudioPlayer = ({ file, onEnded, onError, preservePlaybackOnBlur = true, resumeOnFocus = true }: AudioPlayerOptions) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState<number[]>([50]);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [audioLoadError, setAudioLoadError] = useState<string | null>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const progressInterval = useRef<ReturnType<typeof setInterval>>();
  const wasPlayingBeforeBlur = useRef<boolean>(false);
  const errorShownRef = useRef<boolean>(false);

  // Cleanup function to properly release resources
  const cleanupAudio = () => {
    console.log('[AudioPlayer] Running cleanupAudio');
    if (audioRef.current) {
      console.log('[AudioPlayer] Pausing and resetting audio element');
      audioRef.current.pause();
      // Remove event listeners to prevent memory leaks
      audioRef.current.removeEventListener('error', handleError);
      audioRef.current.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audioRef.current.removeEventListener('ended', handleEnded);
      audioRef.current.removeEventListener('canplay', handleCanPlay); // Added listener removal
      audioRef.current.removeEventListener('playing', handlePlaying); // Added listener removal
      audioRef.current.removeEventListener('pause', handlePause); // Added listener removal
      audioRef.current.src = ''; // Reset source
      audioRef.current.load(); // Attempt to release file lock
      audioRef.current = null; // Nullify the ref
    } else {
      console.log('[AudioPlayer] No audio element ref to clean up');
    }
    
    if (audioUrlRef.current) {
      try {
        console.log('[AudioPlayer] Revoking Object URL:', audioUrlRef.current);
        URL.revokeObjectURL(audioUrlRef.current);
      } catch (e) {
        console.warn('[AudioPlayer] Error revoking URL:', e);
      }
      audioUrlRef.current = null;
    } else {
      console.log('[AudioPlayer] No Object URL ref to clean up');
    }
    
    if (progressInterval.current) {
      console.log('[AudioPlayer] Clearing progress interval');
      clearInterval(progressInterval.current);
      progressInterval.current = undefined;
    }
  };

  // Define event handlers as separate functions for easier add/remove
  const handleError = (e: Event) => {
    const audio = e.target as HTMLAudioElement;
    const errorCode = audio.error ? audio.error.code : 'unknown';
    const errorMessage = audio.error ? audio.error.message : 'Unknown error';
    console.error(`[AudioPlayer] Audio error event. Code: ${errorCode}, Message: ${errorMessage}`, e);
    
    if (!errorShownRef.current) {
      errorShownRef.current = true;
      const formattedError = `Error loading/playing audio: ${errorMessage || `Code ${errorCode}`}`;
      setAudioLoadError(formattedError);
      toast.error('Error con el archivo de audio', {
        description: `No se pudo cargar o reproducir. ${errorMessage ? `Detalle: ${errorMessage}` : ''}`,
        duration: 5000,
      });
      if (onError) onError(formattedError);
    }
  };

  const handleLoadedMetadata = (e: Event) => {
    const audio = e.target as HTMLAudioElement;
    console.log(`[AudioPlayer] Event: loadedmetadata. Duration: ${audio.duration}s`);
    setDuration(audio.duration);
  };

  const handleEnded = () => {
    console.log('[AudioPlayer] Event: ended');
    setIsPlaying(false);
    setProgress(duration); // Ensure progress shows full at the end
    if (progressInterval.current) clearInterval(progressInterval.current);
    if (onEnded) onEnded();
  };

  const handleCanPlay = (e: Event) => {
    const audio = e.target as HTMLAudioElement;
    console.log(`[AudioPlayer] Event: canplay. ReadyState: ${audio.readyState}`);
    // Attempt to restore position here if needed, maybe after user interaction
    const storedPosition = sessionStorage.getItem(`audio-position-${file?.name}`);
     if (storedPosition && audioRef.current) {
       const position = parseFloat(storedPosition);
       if (!isNaN(position) && position > 0 && position < audioRef.current.duration) {
         console.log(`[AudioPlayer] Restoring position on canplay: ${position}s`);
         audioRef.current.currentTime = position;
         setProgress(position);
       } else {
         console.log(`[AudioPlayer] Invalid stored position: ${storedPosition}`);
       }
     }
  };

   const handlePlaying = () => {
     console.log('[AudioPlayer] Event: playing');
     setIsPlaying(true);
     updateProgress();
   };

   const handlePause = () => {
     console.log('[AudioPlayer] Event: pause');
     setIsPlaying(false);
     if (progressInterval.current) {
       clearInterval(progressInterval.current);
       progressInterval.current = undefined;
     }
     // Save position on pause
     if (audioRef.current && file) {
       sessionStorage.setItem(`audio-position-${file.name}`, String(audioRef.current.currentTime));
       console.log(`[AudioPlayer] Saved position on pause: ${audioRef.current.currentTime}`);
     }
   };

  useEffect(() => {
    console.log('[AudioPlayer] useEffect triggered. File:', file?.name);
    // Reset error state when file changes
    setAudioLoadError(null);
    errorShownRef.current = false;
    // Reset playback state
    setIsPlaying(false);
    setProgress(0);
    setDuration(0);

    // Clean up previous audio instance before creating a new one
    console.log('[AudioPlayer] Cleaning up previous audio before setting up new one...');
    cleanupAudio(); // *** Make sure cleanup runs first ***
    
    if (!file) {
      console.log('[AudioPlayer] No file provided, skipping setup.');
      // Ensure state is reset if file becomes null
       setIsPlaying(false);
       setProgress(0);
       setDuration(0);
      return;
    }

    // Validate file before attempting to create an audio object
    console.log(`[AudioPlayer] Validating file: ${file.name}`);
    if (!validateAudioFile(file)) {
      console.error('[AudioPlayer] Invalid audio file, setup aborted.');
      setAudioLoadError('Invalid audio file format or size');
      // Ensure cleanup happened if validation fails after potential partial setup
      cleanupAudio();
      return;
    }

    try {
      console.log(`[AudioPlayer] Initializing audio with file: ${file.name}, type: ${file.type}, size: ${file.size} bytes`);
      
      // Create Object URL
      const fileUrl = URL.createObjectURL(file);
      audioUrlRef.current = fileUrl;
      console.log(`[AudioPlayer] Created Object URL: ${fileUrl}`);
      
      // Create Audio element
      const audio = new Audio();
      console.log('[AudioPlayer] Created new HTMLAudioElement');
      audioRef.current = audio; // Assign to ref immediately
      
      // Add event listeners
      console.log('[AudioPlayer] Adding event listeners');
      audio.addEventListener('error', handleError);
      audio.addEventListener('loadedmetadata', handleLoadedMetadata);
      audio.addEventListener('ended', handleEnded);
      audio.addEventListener('canplay', handleCanPlay); // Log when ready to play
      audio.addEventListener('playing', handlePlaying); // Listen for actual playing start
      audio.addEventListener('pause', handlePause); // Listen for pause event

      // Set audio properties
      audio.preload = 'metadata'; // 'auto' might be better if immediate playback is expected
      audio.volume = volume[0] / 100;
      audio.muted = isMuted; // Apply initial mute state
      audio.playbackRate = playbackRate; // Apply initial playback rate

      console.log(`[AudioPlayer] Setting audio source to Object URL`);
      audio.src = fileUrl;
      
      // Explicitly load metadata - helps sometimes
      audio.load();
      console.log('[AudioPlayer] Called audio.load()');

      // Attempt to restore position immediately after setting src (might be too early, 'canplay' is better)
      const storedPositionKey = `audio-position-${file.name}`;
      const storedPosition = sessionStorage.getItem(storedPositionKey);
      if (storedPosition) {
        const position = parseFloat(storedPosition);
        if (!isNaN(position) && position > 0) {
          console.log(`[AudioPlayer] Attempting to set initial currentTime from storage: ${position}s`);
          // Setting currentTime often needs the media to be ready, handled better in 'canplay'
           // audio.currentTime = position; // Commented out - rely on 'canplay' handler
           // setProgress(position); // Set initial progress based on stored value
        } else {
          console.log(`[AudioPlayer] Invalid stored position found: ${storedPosition}`);
          sessionStorage.removeItem(storedPositionKey); // Clean up invalid entry
        }
      } else {
        console.log('[AudioPlayer] No stored position found for this file.');
      }
      
      // Return cleanup function
      return () => {
        console.log('[AudioPlayer] Cleanup function running from useEffect return');
        // Save final position before cleanup
        if (audioRef.current && file) {
          sessionStorage.setItem(`audio-position-${file.name}`, String(audioRef.current.currentTime));
          console.log(`[AudioPlayer] Saved final position on cleanup: ${audioRef.current.currentTime}`);
        }
        cleanupAudio();
      };
    } catch (error) {
      console.error('[AudioPlayer] Error during audio player initialization:', error);
      if (!errorShownRef.current) {
        errorShownRef.current = true;
        const errorMsg = error instanceof Error ? error.message : 'Unknown initialization error';
        setAudioLoadError(errorMsg);
        toast.error('Error setting up audio player', { description: errorMsg });
        if (onError) onError(`Error initializing audio: ${errorMsg}`);
      }
      // Ensure cleanup happens even if initialization fails
      cleanupAudio();
    }
  }, [file]); // Dependencies: only 'file'. Other states managed internally or via props.

  // Removed volume, isMuted, playbackRate from deps as they are handled via refs/direct calls now

  const updateProgress = () => {
    if (!audioRef.current) {
        console.warn('[AudioPlayer] updateProgress called but audioRef is null');
        return;
    }
    // Clear existing interval before starting a new one
    if (progressInterval.current) {
        clearInterval(progressInterval.current);
    }
    console.log('[AudioPlayer] Starting progress interval');
    progressInterval.current = setInterval(() => {
        // Added checks for audioRef.current inside interval
        if (audioRef.current && !audioRef.current.paused) {
            const currentTime = audioRef.current.currentTime || 0;
            setProgress(currentTime);
            // console.log(`[AudioPlayer] Progress update: ${currentTime}`); // Optional: noisy log
        } else {
            // If paused or ref is gone, clear interval
             // console.warn('[AudioPlayer] Audio paused or ref lost, clearing progress interval from inside.'); // Optional: noisy log
             // if (progressInterval.current) {
             //   clearInterval(progressInterval.current);
             //   progressInterval.current = undefined;
             // }
        }
    }, 500); // Update interval to 500ms for smoother progress bar
  };

  const handlePlayPause = () => {
    if (!audioRef.current) {
        console.warn('[AudioPlayer] handlePlayPause called but audioRef is null.');
        toast.error("Error de reproductor", { description: "No se puede reproducir, el audio no está listo." });
        return;
    }
    if (audioLoadError) {
        console.warn('[AudioPlayer] Play attempt blocked due to audio load error:', audioLoadError);
        toast.error("Error de audio", { description: "No se puede reproducir debido a un error previo." });
        return;
    }
    
    if (isPlaying) {
      console.log('[AudioPlayer] Pausing audio via handlePlayPause');
      audioRef.current.pause();
      // State update will happen via 'pause' event listener -> handlePause
    } else {
      console.log('[AudioPlayer] Attempting to play audio via handlePlayPause');
      const playPromise = audioRef.current.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('[AudioPlayer] Play promise resolved successfully.');
            // State update will happen via 'playing' event listener -> handlePlaying
          })
          .catch(error => {
            console.error('[AudioPlayer] Play promise rejected:', error);
            // Error handling based on error type
            if (error.name === 'NotSupportedError') {
              toast.error('Formato de audio no soportado');
              setAudioLoadError('Formato no soportado');
              if (onError) onError('Formato no soportado');
            } else if (error.name === 'NotAllowedError') {
              console.warn('[AudioPlayer] Autoplay prevented. User interaction likely required.');
              toast.warning('Interacción requerida', { description: 'Haz clic en play para iniciar el audio.' });
              // Don't set isPlaying to true here
              setIsPlaying(false); // Ensure state reflects reality
            } else {
              if (!errorShownRef.current) {
                errorShownRef.current = true;
                toast.error('Error al reproducir el audio');
                setAudioLoadError(`Error al reproducir: ${error.message}`);
                 if (onError) onError(`Error playing audio: ${error}`);
              }
            }
             setIsPlaying(false); // Ensure playing state is false if play failed
          });
      } else {
         // If playPromise is undefined, assume playback started (older browsers?)
         console.warn('[AudioPlayer] audio.play() did not return a promise.');
         // Manually update state as event listeners might not fire consistently
         if (!audioRef.current.paused) {
             handlePlaying();
         }
      }
    }
  };

  const handleSeek = (time: number) => {
    if (!audioRef.current) {
        console.warn('[AudioPlayer] handleSeek called but audioRef is null.');
        return;
    }
    if (isNaN(time) || time < 0) {
        console.warn(`[AudioPlayer] Invalid seek time: ${time}`);
        return;
    }
    
    try {
      // Ensure time is within bounds
      const seekTime = Math.max(0, Math.min(time, duration));
      audioRef.current.currentTime = seekTime;
      setProgress(seekTime); // Immediately update progress state
      console.log(`[AudioPlayer] Seeked to ${seekTime.toFixed(2)}s`);
    } catch (error) {
      console.error('[AudioPlayer] Error seeking:', error);
      // Don't usually need a toast for seek errors
    }
  };

  const handleSkip = (direction: 'forward' | 'backward', amount: number = 10) => {
    if (!audioRef.current) return;
    
    const newTime = direction === 'forward'
      ? Math.min(audioRef.current.currentTime + amount, duration)
      : Math.max(audioRef.current.currentTime - amount, 0);
    
    handleSeek(newTime);
  };

  const handleVolumeChange = (value: number[]) => {
    if (!audioRef.current) return;
    
    const newVolumeValue = value[0];
    setVolume([newVolumeValue]); // Update state
    audioRef.current.volume = newVolumeValue / 100;
    console.log(`[AudioPlayer] Volume changed to ${newVolumeValue}`);
    
    // Automatically mute/unmute based on volume value
    const shouldMute = newVolumeValue === 0;
    if (shouldMute !== isMuted) {
      setIsMuted(shouldMute);
      audioRef.current.muted = shouldMute;
      console.log(`[AudioPlayer] Mute state changed via volume: ${shouldMute}`);
    }
  };

  const handleVolumeUp = () => {
    const currentVolume = volume[0];
    const newVolume = Math.min(100, currentVolume + 5);
    if (newVolume !== currentVolume) {
      handleVolumeChange([newVolume]);
    }
  };

  const handleVolumeDown = () => {
    const currentVolume = volume[0];
    const newVolume = Math.max(0, currentVolume - 5);
     if (newVolume !== currentVolume) {
      handleVolumeChange([newVolume]);
    }
  };

  const handleToggleMute = () => {
    if (!audioRef.current) return;
    const newMutedState = !isMuted;
    audioRef.current.muted = newMutedState;
    setIsMuted(newMutedState);
    console.log(`[AudioPlayer] Mute toggled to: ${newMutedState}`);
    // If unmuting and volume is 0, set volume to a default (e.g., 10)
     if (!newMutedState && volume[0] === 0) {
       handleVolumeChange([10]);
     }
  };

  const handlePlaybackRateChange = () => {
    if (!audioRef.current) return;
    const rates = [0.5, 1.0, 1.5, 2.0];
    const currentIndex = rates.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % rates.length;
    const newRate = rates[nextIndex];
    
    audioRef.current.playbackRate = newRate;
    setPlaybackRate(newRate); // Update state
    toast.info(`Velocidad: ${newRate}x`);
    console.log(`[AudioPlayer] Playback rate changed to ${newRate}x`);
  };

  // Add enhanced tab visibility handling
  useEffect(() => {
    if (!file || !preservePlaybackOnBlur) return; // Only run if feature enabled and file exists

    const handleVisibilityChange = () => {
      const storedPositionKey = `audio-position-${file.name}`;
      
      if (document.hidden) {
        // Tab is being hidden
        console.log('[AudioPlayer] Tab hidden.');
        wasPlayingBeforeBlur.current = isPlaying; // Remember if it was playing
        
        // Save current state to session storage
        sessionStorage.setItem('audio-was-playing', isPlaying ? 'true' : 'false');
        if (audioRef.current) {
          const currentPos = audioRef.current.currentTime;
          sessionStorage.setItem(storedPositionKey, String(currentPos));
          console.log(`[AudioPlayer] Saved state on blur: playing=${isPlaying}, position=${currentPos}`);
        }
        // Optional: Pause audio if preservePlaybackOnBlur is false? No, the flag controls saving/restoring.
        // if (!preservePlaybackOnBlur && isPlaying && audioRef.current) {
        //    audioRef.current.pause();
        // }

      } else {
        // Tab is becoming visible again
        console.log('[AudioPlayer] Tab visible.');
        
        // Restore position if available
        const storedPosition = sessionStorage.getItem(storedPositionKey);
        if (storedPosition && audioRef.current) {
          const position = parseFloat(storedPosition);
          if (!isNaN(position) && Math.abs(audioRef.current.currentTime - position) > 0.5) { // Check if position differs significantly
             console.log(`[AudioPlayer] Restoring position on focus: ${position}s`);
             audioRef.current.currentTime = position;
             setProgress(position); // Update progress state too
          }
        }

        // Resume playback if configured and was playing before blur
        const shouldResume = sessionStorage.getItem('audio-was-playing') === 'true';
        if (resumeOnFocus && shouldResume && audioRef.current && audioRef.current.paused) {
          console.log('[AudioPlayer] Attempting to resume playback on focus...');
          // Use handlePlayPause to attempt playback respecting potential errors/policies
          // Small delay might still be needed in some browsers
          setTimeout(() => {
             if (audioRef.current && audioRef.current.paused) { // Double check if still paused
                console.log('[AudioPlayer] Calling handlePlayPause to resume.');
                handlePlayPause();
             }
          }, 100); 
        }
      }
    };

    console.log('[AudioPlayer] Adding visibilitychange listener');
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Initial check for stored state when hook mounts (if file exists)
     const storedPositionKey = `audio-position-${file.name}`;
     const storedPosition = sessionStorage.getItem(storedPositionKey);
     if (storedPosition && audioRef.current) {
       const position = parseFloat(storedPosition);
       if (!isNaN(position) && position > 0) {
         console.log(`[AudioPlayer] Applying initial stored position: ${position}s`);
         // Set initial time carefully - wait for 'canplay' or 'loadedmetadata'? Handled in 'canplay' now.
         // audioRef.current.currentTime = position;
         // setProgress(position);
       }
     }


    return () => {
      console.log('[AudioPlayer] Removing visibilitychange listener');
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      // Clean up session storage related to this hook instance? Maybe not, might be useful across page loads.
      // sessionStorage.removeItem('audio-was-playing');
      // if (file) sessionStorage.removeItem(`audio-position-${file.name}`);
    };
  }, [file, isPlaying, preservePlaybackOnBlur, resumeOnFocus, duration]); // Added duration to re-evaluate seek bounds
  
  useMediaControls({
    onPlay: () => !isPlaying && handlePlayPause(),
    onPause: () => isPlaying && handlePlayPause(),
    onSeekBackward: (details) => handleSkip('backward', details.seekOffset),
    onSeekForward: (details) => handleSkip('forward', details.seekOffset),
    title: file?.name || 'Audio'
  });

  useKeyboardShortcuts({
    onPlayPause: handlePlayPause,
    onSkipBackward: () => handleSkip('backward'),
    onSkipForward: () => handleSkip('forward'),
    onVolumeUp: handleVolumeUp,
    onVolumeDown: handleVolumeDown,
    onToggleMute: handleToggleMute
  });

  return {
    isPlaying,
    currentTime: progress,
    duration,
    volume,
    isMuted,
    playbackRate,
    audioError: audioLoadError, // Expose the specific load/play error
    // Playback control handlers
    handlePlayPause,
    handleSeek,
    handleSkip,
    // Volume control handlers
    handleToggleMute,
    handleVolumeChange,
    // Playback rate handler
    handlePlaybackRateChange,
    // Utility/Internal state setters (use with caution)
    seekToTimestamp: handleSeek, // Alias for clarity if needed elsewhere
    setIsPlaying // Expose if absolutely necessary for external sync, but prefer event-driven updates
  };
};

// Reminder about file length
