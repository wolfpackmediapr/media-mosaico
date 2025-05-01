
import { useState, useEffect, useRef } from 'react';
import { Howl } from 'howler';

export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  playbackRate: number;
  volume: number;
  isMuted: boolean;
}

interface UsePlaybackStateOptions {
  howl: Howl | null;
}

/**
 * Hook for managing playback state (play/pause, time tracking)
 */
export const usePlaybackState = ({ howl }: UsePlaybackStateOptions): [
  PlaybackState,
  {
    setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
    setPlaybackRate: React.Dispatch<React.SetStateAction<number>>;
    setVolume: React.Dispatch<React.SetStateAction<number>>;
    setIsMuted: React.Dispatch<React.SetStateAction<boolean>>;
  }
] => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  
  const [isSeeking, setIsSeeking] = useState(false);
  const intervalIdRef = useRef<number | null>(null);

  // Setup howl event handlers when howl changes
  useEffect(() => {
    if (!howl) return;
    
    // Set up event handlers on the howl instance
    howl.on('play', () => {
      console.log('[PlaybackState] Audio started playing');
      setIsPlaying(true);
      startUpdateInterval();
    });
    
    howl.on('pause', () => {
      console.log('[PlaybackState] Audio paused');
      setIsPlaying(false);
      stopUpdateInterval();
    });
    
    howl.on('stop', () => {
      console.log('[PlaybackState] Audio stopped');
      setIsPlaying(false);
      stopUpdateInterval();
      setCurrentTime(0);
    });
    
    howl.on('seek', () => {
      console.log('[PlaybackState] Audio seeked');
      setCurrentTime(howl.seek() as number);
    });

    // Set initial values from howl
    setVolume(howl.volume());
    setPlaybackRate(howl.rate());
    setIsMuted(howl.mute());
    
    return () => {
      // Remove event listeners when howl changes
      howl.off('play');
      howl.off('pause');
      howl.off('stop');
      howl.off('seek');
      stopUpdateInterval();
    };
  }, [howl]);
  
  // Apply playback rate changes to howl
  useEffect(() => {
    if (howl) {
      howl.rate(playbackRate);
      console.log(`[PlaybackState] Set playback rate to ${playbackRate}`);
    }
  }, [playbackRate, howl]);
  
  // Apply volume changes to howl
  useEffect(() => {
    if (howl) {
      howl.volume(volume);
      console.log(`[PlaybackState] Set volume to ${volume}`);
    }
  }, [volume, howl]);
  
  // Apply mute changes to howl
  useEffect(() => {
    if (howl) {
      howl.mute(isMuted);
      console.log(`[PlaybackState] Set mute to ${isMuted}`);
    }
  }, [isMuted, howl]);

  const startUpdateInterval = () => {
    if (intervalIdRef.current) {
      stopUpdateInterval();
    }

    intervalIdRef.current = window.setInterval(() => {
      if (howl && howl.playing() && !isSeeking) {
        setCurrentTime(howl.seek() as number);
      }
    }, 250);
  };

  const stopUpdateInterval = () => {
    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }
  };
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopUpdateInterval();
    };
  }, []);

  return [
    { isPlaying, currentTime, playbackRate, volume, isMuted },
    { setIsPlaying, setPlaybackRate, setVolume, setIsMuted }
  ];
};
