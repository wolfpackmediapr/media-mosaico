
import React from 'react';
import { PlaybackControls as PlaybackControlsType } from './types';
import { PlayerControls } from '@/components/ui/audio-player/PlayerControls';
import { PlayDirection } from '@/types/player';

interface PlaybackControlsProps {
  isPlaying: boolean;
  controls: PlaybackControlsType;
}

export function PlaybackControls({ isPlaying, controls }: PlaybackControlsProps) {
  const { handlePlayPause, handleSkip } = controls;
  
  // Adapter function to match interfaces
  const handleSkipAdapter = (direction: PlayDirection) => {
    handleSkip(direction);
  };
  
  return (
    <PlayerControls 
      isPlaying={isPlaying}
      onPlayPause={handlePlayPause}
      onSkip={handleSkipAdapter}
      size="md"
    />
  );
}
