
import React, { useEffect, useState } from 'react';
import { CirclePlay, CirclePause, SkipForward, SkipBack } from "lucide-react";
import { PlaybackControls as PlaybackControlsType } from './types';

interface PlaybackControlsProps {
  isPlaying: boolean;
  controls: PlaybackControlsType;
}

export function PlaybackControls({ isPlaying, controls }: PlaybackControlsProps) {
  const { handlePlayPause, handleSkip } = controls;
  
  // Add local UI state to prevent flickering during state transitions
  const [localIsPlaying, setLocalIsPlaying] = useState(isPlaying);
  
  // Use a timer to smooth transitions between UI states
  useEffect(() => {
    // When the isPlaying prop changes, update local state after a short delay
    // This smooths out flickering caused by rapid state changes
    const timerId = setTimeout(() => {
      if (localIsPlaying !== isPlaying) {
        console.log('[PlaybackControls] Updating UI state:', isPlaying ? 'playing' : 'paused');
        setLocalIsPlaying(isPlaying);
      }
    }, 50);
    
    return () => clearTimeout(timerId);
  }, [isPlaying, localIsPlaying]);
  
  // Handler that updates local state immediately for better UI feedback
  const handlePlayPauseWithUIUpdate = () => {
    // Toggle local state immediately for responsive UI
    setLocalIsPlaying(!localIsPlaying);
    // Call the actual handler
    handlePlayPause();
    
    // Set a timeout to sync back with actual state if needed
    setTimeout(() => {
      if (localIsPlaying === isPlaying) {
        console.log('[PlaybackControls] Correcting UI state due to mismatch');
        setLocalIsPlaying(!localIsPlaying);
      }
    }, 300);
  };
  
  return (
    <div className="flex items-center space-x-1">
      <button
        onClick={() => handleSkip('backward')}
        className="p-2 text-gray-600 dark:text-gray-400 
          hover:text-primary dark:hover:text-primary 
          transition-colors"
        title="Retroceder 10 segundos"
      >
        <SkipBack className="w-5 h-5" />
      </button>
      <button
        onClick={handlePlayPauseWithUIUpdate}
        className="p-2 text-primary hover:opacity-80 transition-colors"
      >
        {localIsPlaying ?
          <CirclePause className="w-8 h-8" /> :
          <CirclePlay className="w-8 h-8" />
        }
      </button>
      <button
        onClick={() => handleSkip('forward')}
        className="p-2 text-gray-600 dark:text-gray-400 
          hover:text-primary dark:hover:text-primary 
          transition-colors"
        title="Adelantar 10 segundos"
      >
        <SkipForward className="w-5 h-5" />
      </button>
    </div>
  );
}
