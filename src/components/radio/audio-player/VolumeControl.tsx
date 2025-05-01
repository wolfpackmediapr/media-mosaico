
import React, { useState } from 'react';
import { Volume1, Volume2, VolumeX } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { VolumeControls } from './types';

interface VolumeControlProps {
  volumeControls: VolumeControls;
}

export function VolumeControl({ volumeControls }: VolumeControlProps) {
  const { isMuted, volume, handleVolumeChange, toggleMute } = volumeControls;
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  
  const VolumeIcon = isMuted ? VolumeX : volume[0] < 50 ? Volume1 : Volume2;

  return (
    <div className="relative" 
      onMouseEnter={() => setShowVolumeSlider(true)} 
      onMouseLeave={() => setShowVolumeSlider(false)}
    >
      <button
        onClick={toggleMute}
        className="p-2 text-gray-600 dark:text-gray-400 
          hover:text-primary dark:hover:text-primary 
          transition-colors"
      >
        <VolumeIcon className="w-5 h-5" />
      </button>
      
      {showVolumeSlider && (
        <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-background border border-border rounded-lg shadow-lg p-3 w-24">
          <Slider
            defaultValue={volume}
            max={100}
            step={1}
            value={volume}
            onValueChange={handleVolumeChange}
            orientation="vertical"
            className="h-24"
          />
        </div>
      )}
    </div>
  );
}
