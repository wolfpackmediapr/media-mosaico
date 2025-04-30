
import React from 'react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Volume1, Volume2, VolumeX } from 'lucide-react';
import { VolumeControls } from './types'; // Ensure this path is correct

interface VolumeControlProps {
  volumeControls: VolumeControls; // volume is number here
}

export const VolumeControl = ({ volumeControls }: VolumeControlProps) => {
  const { isMuted, volume, handleVolumeChange, toggleMute } = volumeControls;

  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 50 ? Volume1 : Volume2;

  return (
    <div className="flex items-center space-x-2 w-32">
      <Button variant="ghost" size="icon" onClick={toggleMute}>
        <VolumeIcon className="h-5 w-5" />
      </Button>
      <Slider
        value={[isMuted ? 0 : volume]} // Pass volume as array [number]
        max={100}
        step={1}
        className="flex-grow"
        onValueChange={(value: number[]) => handleVolumeChange(value)} // handleVolumeChange expects number | number[]
        aria-label="Volume"
      />
    </div>
  );
};
