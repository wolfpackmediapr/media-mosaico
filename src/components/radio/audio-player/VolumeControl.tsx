
import React from 'react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Volume1, Volume2, VolumeX } from 'lucide-react';

interface VolumeControls {
  isMuted: boolean;
  volume: number | number[]; // Accept both number and number[]
  handleVolumeChange: (value: number | number[]) => void;
  toggleMute: () => void;
}

interface VolumeControlProps {
  volumeControls: VolumeControls;
}

export const VolumeControl = ({ volumeControls }: VolumeControlProps) => {
  const { isMuted, volume, handleVolumeChange, toggleMute } = volumeControls;

  // Convert volume to number for comparison
  const volumeValue = Array.isArray(volume) ? volume[0] : volume;
  
  const VolumeIcon = isMuted || volumeValue === 0 ? VolumeX : volumeValue < 50 ? Volume1 : Volume2;

  // Ensure volume is always passed as an array to the Slider component
  const volumeForSlider = Array.isArray(volume) ? volume : [volumeValue];

  console.log('[VolumeControl] Volume:', volume, 'Type:', typeof volume, 'For slider:', volumeForSlider);

  return (
    <div className="flex items-center space-x-2 w-32">
      <Button variant="ghost" size="icon" onClick={toggleMute}>
        <VolumeIcon className="h-5 w-5" />
      </Button>
      <Slider
        value={volumeForSlider} // Always provide as array
        max={100}
        step={1}
        className="flex-grow"
        onValueChange={handleVolumeChange} // handleVolumeChange accepts number | number[]
        aria-label="Volume"
      />
    </div>
  );
};
