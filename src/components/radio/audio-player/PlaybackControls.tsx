
import React, { useEffect, useState, useRef } from 'react';
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
  // Track the last time we processed a state change
  const lastStateChangeTimeRef = useRef<number>(Date.now());
  // Track if a user-initiated action is in progress
  const actionInProgressRef = useRef<boolean>(false);
  
  // Use a timer to smooth transitions between UI states
  useEffect(() => {
    // Only update if we haven't received a state change recently (debounce)
    // This prevents flickering from rapid state changes
    const timeSinceLastChange = Date.now() - lastStateChangeTimeRef.current;
    
    if (timeSinceLastChange > 30) { // Reduce from 50ms to 30ms for faster response
      if (localIsPlaying !== isPlaying) {
        console.log('[PlaybackControls] Updating UI state:', isPlaying ? 'playing' : 'paused');
        setLocalIsPlaying(isPlaying);
        lastStateChangeTimeRef.current = Date.now();
      }
    } else {
      // If changes are happening too quickly, schedule an update
      const timerId = setTimeout(() => {
        if (localIsPlaying !== isPlaying) {
          console.log('[PlaybackControls] Delayed UI state update:', isPlaying ? 'playing' : 'paused');
          setLocalIsPlaying(isPlaying);
          lastStateChangeTimeRef.current = Date.now();
        }
      }, 40); // Slightly faster update (was 50ms)
      
      return () => clearTimeout(timerId);
    }
  }, [isPlaying, localIsPlaying]);
  
  // Handler that updates local state immediately for better UI feedback
  const handlePlayPauseWithUIUpdate = () => {
    // Prevent multiple rapid clicks
    if (actionInProgressRef.current) {
      console.log('[PlaybackControls] Action already in progress, ignoring click');
      return;
    }
    
    // Set action flag to prevent multiple clicks
    actionInProgressRef.current = true;
    
    // Toggle local state immediately for responsive UI
    setLocalIsPlaying(!localIsPlaying);
    lastStateChangeTimeRef.current = Date.now();
    
    // Call the actual handler
    console.log('[PlaybackControls] Handling play/pause click, current local state:', 
      localIsPlaying ? 'playing' : 'paused', 'switching to', 
      !localIsPlaying ? 'playing' : 'paused');
    handlePlayPause();
    
    // Reset action flag after a short delay
    setTimeout(() => {
      actionInProgressRef.current = false;
    }, 200); // Short timeout to prevent rapid clicks
    
    // Set a timeout to sync back with actual state if needed
    // This ensures we don't get stuck in the wrong state
    setTimeout(() => {
      if (localIsPlaying === isPlaying) {
        console.log('[PlaybackControls] Correcting UI state due to mismatch');
        setLocalIsPlaying(!localIsPlaying);
        lastStateChangeTimeRef.current = Date.now();
      }
    }, 250); // Reduced from 300ms for faster correction
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
