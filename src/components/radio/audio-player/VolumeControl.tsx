
import React from 'react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Volume1, Volume2, VolumeX } from 'lucide-react';

interface VolumeControls {
  isMuted: boolean;
  volume: number; // Changed from number[] to number
  handleVolumeChange: (value: number | number[]) => void;
  toggleMute: () => void;
}

interface VolumeControlProps {
  volumeControls: VolumeControls;
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
        value={[isMuted ? 0 : volume]} // Convert numeric volume to array for Slider
        max={100}
        step={1}
        className="flex-grow"
        onValueChange={handleVolumeChange} // handleVolumeChange accepts number | number[]
        aria-label="Volume"
      />
    </div>
  );
};
