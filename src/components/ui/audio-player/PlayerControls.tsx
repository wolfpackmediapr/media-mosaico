
import React from 'react';
import { CirclePlay, CirclePause, SkipForward, SkipBack } from "lucide-react";
import { useAudioDebounce } from '@/hooks/useAudioDebounce';
import { PlayDirection } from '@/types/player';

interface PlayerControlsProps {
  isPlaying: boolean;
  onPlayPause: () => void;
  onSkip: (direction: PlayDirection, amount?: number) => void;
  size?: 'sm' | 'md' | 'lg';
}

export function PlayerControls({ 
  isPlaying, 
  onPlayPause, 
  onSkip,
  size = 'md'
}: PlayerControlsProps) {
  const { debounce } = useAudioDebounce();
  
  // Size mappings for the controls
  const sizeClasses = {
    sm: {
      container: "space-x-1",
      skipButton: "p-1",
      skipIcon: "w-4 h-4",
      playButton: "p-1",
      playIcon: "w-6 h-6"
    },
    md: {
      container: "space-x-1",
      skipButton: "p-2",
      skipIcon: "w-5 h-5",
      playButton: "p-2",
      playIcon: "w-8 h-8"
    },
    lg: {
      container: "space-x-2",
      skipButton: "p-2",
      skipIcon: "w-6 h-6",
      playButton: "p-2",
      playIcon: "w-10 h-10"
    }
  };
  
  const classes = sizeClasses[size];
  
  // Enhanced event handling with debounced protection
  const handlePlayPauseClick = debounce((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onPlayPause();
  }, 'play-pause', 300);

  const handleSkipClick = debounce((direction: PlayDirection, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onSkip(direction);
  }, 'skip', 300);
  
  return (
    <div className={`flex items-center ${classes.container}`}>
      <button
        onClick={(e) => handleSkipClick('backward', e)}
        className={`${classes.skipButton} text-gray-600 dark:text-gray-400 
          hover:text-primary dark:hover:text-primary 
          transition-colors`}
        title="Back 10 seconds"
        aria-label="Back 10 seconds"
        type="button"
      >
        <SkipBack className={classes.skipIcon} />
      </button>
      <button
        onClick={handlePlayPauseClick}
        className={`${classes.playButton} text-primary hover:opacity-80 transition-colors`}
        aria-label={isPlaying ? "Pause" : "Play"}
        title={isPlaying ? "Pause" : "Play"}
        type="button"
      >
        {isPlaying ?
          <CirclePause className={classes.playIcon} /> :
          <CirclePlay className={classes.playIcon} />
        }
      </button>
      <button
        onClick={(e) => handleSkipClick('forward', e)}
        className={`${classes.skipButton} text-gray-600 dark:text-gray-400 
          hover:text-primary dark:hover:text-primary 
          transition-colors`}
        title="Forward 10 seconds"
        aria-label="Forward 10 seconds"
        type="button"
      >
        <SkipForward className={classes.skipIcon} />
      </button>
    </div>
  );
}
