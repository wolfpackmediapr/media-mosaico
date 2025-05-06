
import React from 'react';
import { VolumeSlider } from '@/components/ui/audio-player/VolumeSlider';
import { VolumeControls } from './types';

interface VolumeControlProps {
  volumeControls: VolumeControls;
}

export function VolumeControl({ volumeControls }: VolumeControlProps) {
  const { isMuted, volume, handleVolumeChange, toggleMute } = volumeControls;
  
  return (
    <VolumeSlider 
      volume={volume}
      isMuted={isMuted}
      onVolumeChange={handleVolumeChange}
      onToggleMute={toggleMute}
      showSliderOnHover={true}
    />
  );
}
