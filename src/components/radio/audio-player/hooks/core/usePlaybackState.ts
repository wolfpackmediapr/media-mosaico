
import { useState, useEffect } from 'react';
import { Howl } from 'howler';

interface PlaybackStateHookProps {
  howl: Howl | null;
}

export const usePlaybackState = ({
  howl
}: PlaybackStateHookProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState([50]);
  const [isMuted, setIsMuted] = useState(false);
  
  // Track current state of Howl instance to prevent operations on invalid instance
  const [isHowlValid, setIsHowlValid] = useState(false);
  
  // Validate Howl instance when it changes
  useEffect(() => {
    // Check if howl is properly initialized with _id property (a key internal property of Howl)
    const isValid = howl && typeof howl === 'object' && howl._src && !howl._destroyed;
    setIsHowlValid(isValid);
    
    // Reset state if howl is invalid
    if (!isValid) {
      setIsPlaying(false);
    }
  }, [howl]);
  
  // Set initial playback rate
  useEffect(() => {
    if (howl && isHowlValid && playbackRate !== 1) {
      try {
        // Only set rate if howl is loaded and valid
        if (howl.state() === 'loaded') {
          howl.rate(playbackRate);
        }
      } catch (error) {
        console.warn("[usePlaybackState] Error setting playback rate:", error);
      }
    }
  }, [howl, isHowlValid, playbackRate]);
  
  // Update playing state when howl changes
  useEffect(() => {
    if (!howl || !isHowlValid) {
      return;
    }
    
    const updateIsPlaying = () => {
      try {
        setIsPlaying(howl.playing());
      } catch (error) {
        console.warn("[usePlaybackState] Error checking playing state:", error);
        setIsPlaying(false);
      }
    };
    
    // Set up event listeners
    howl.on('play', updateIsPlaying);
    howl.on('pause', updateIsPlaying);
    howl.on('stop', () => setIsPlaying(false));
    howl.on('end', () => setIsPlaying(false));
    
    // Check initial state
    updateIsPlaying();
    
    // Cleanup event listeners
    return () => {
      try {
        if (howl && isHowlValid) {
          howl.off('play');
          howl.off('pause');
          howl.off('stop');
          howl.off('end');
        }
      } catch (error) {
        console.warn("[usePlaybackState] Error cleaning up event listeners:", error);
      }
    };
  }, [howl, isHowlValid]);
  
  // Set up seek tracking
  useEffect(() => {
    if (!howl || !isHowlValid) {
      return;
    }
    
    let seekInterval: NodeJS.Timeout | null = null;
    
    const startTracking = () => {
      if (seekInterval) return;
      
      seekInterval = setInterval(() => {
        try {
          if (howl && isHowlValid) {
            setCurrentTime(howl.seek() || 0);
          }
        } catch (error) {
          console.warn("[usePlaybackState] Error during seek tracking:", error);
          stopTracking();
        }
      }, 200); // Update 5 times per second
    };
    
    const stopTracking = () => {
      if (seekInterval) {
        clearInterval(seekInterval);
        seekInterval = null;
      }
    };
    
    // Start tracking when playing
    if (isPlaying) {
      startTracking();
    } else {
      stopTracking();
    }
    
    // Cleanup on unmount
    return () => {
      stopTracking();
    };
  }, [howl, isPlaying, isHowlValid]);
  
  return [
    { isPlaying, currentTime, playbackRate, volume, isMuted },
    { setIsPlaying, setPlaybackRate, setVolume, setIsMuted }
  ] as const;
};
