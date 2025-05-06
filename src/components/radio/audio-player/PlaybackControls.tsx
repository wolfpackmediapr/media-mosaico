
import React from 'react';
import { CirclePlay, CirclePause, SkipForward, SkipBack } from "lucide-react";
import { PlaybackControls as PlaybackControlsType } from './types';

interface PlaybackControlsProps {
  isPlaying: boolean;
  controls: PlaybackControlsType;
}

export function PlaybackControls({ isPlaying, controls }: PlaybackControlsProps) {
  const { handlePlayPause, handleSkip } = controls;
  
  // Prevent event propagation to avoid multiple click handlers triggering
  const handlePlayPauseClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    handlePlayPause();
  };

  const handleSkipClick = (direction: 'backward' | 'forward', e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    handleSkip(direction);
  };
  
  return (
    <div className="flex items-center space-x-1">
      <button
        onClick={(e) => handleSkipClick('backward', e)}
        className="p-2 text-gray-600 dark:text-gray-400 
          hover:text-primary dark:hover:text-primary 
          transition-colors"
        title="Retroceder 10 segundos"
        aria-label="Retroceder 10 segundos"
        type="button"
      >
        <SkipBack className="w-5 h-5" />
      </button>
      <button
        onClick={handlePlayPauseClick}
        className="p-2 text-primary hover:opacity-80 transition-colors"
        aria-label={isPlaying ? "Pausar" : "Reproducir"}
        title={isPlaying ? "Pausar" : "Reproducir"}
        type="button"
      >
        {isPlaying ?
          <CirclePause className="w-8 h-8" /> :
          <CirclePlay className="w-8 h-8" />
        }
      </button>
      <button
        onClick={(e) => handleSkipClick('forward', e)}
        className="p-2 text-gray-600 dark:text-gray-400 
          hover:text-primary dark:hover:text-primary 
          transition-colors"
        title="Adelantar 10 segundos"
        aria-label="Adelantar 10 segundos"
        type="button"
      >
        <SkipForward className="w-5 h-5" />
      </button>
    </div>
  );
}
