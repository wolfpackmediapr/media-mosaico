
import React from 'react';
import { CirclePlay, CirclePause, SkipForward, SkipBack } from "lucide-react";
import { PlaybackControls as PlaybackControlsType } from './types';

interface PlaybackControlsProps {
  isPlaying: boolean;
  controls: PlaybackControlsType;
}

export function PlaybackControls({ isPlaying, controls }: PlaybackControlsProps) {
  const { handlePlayPause, handleSkip } = controls;
  
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
        onClick={handlePlayPause}
        className="p-2 text-primary hover:opacity-80 transition-colors"
      >
        {isPlaying ?
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
