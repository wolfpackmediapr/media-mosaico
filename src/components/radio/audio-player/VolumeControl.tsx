
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
  
  // Handle volume safely - ensure we have an array with valid values
  const safeVolume = Array.isArray(volume) ? volume : [0];
  const validVolume = safeVolume.length > 0 ? safeVolume : [0];
  
  // Always use the first value for icon determination, with a fallback
  const volumeValue = validVolume[0];
  const VolumeIcon = isMuted ? VolumeX : volumeValue < 50 ? Volume1 : Volume2;

  // Handle volume change with proper event prevention
  const handleSliderChange = (newVolume: number[]) => {
    if (Array.isArray(newVolume) && newVolume.length > 0) {
      handleVolumeChange(newVolume);
    }
  };

  // Prevent event bubbling for the toggle mute button
  const handleMuteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    toggleMute();
  };

  return (
    <div className="relative" 
      onMouseEnter={() => setShowVolumeSlider(true)} 
      onMouseLeave={() => setShowVolumeSlider(false)}
    >
      <button
        onClick={handleMuteClick}
        className="p-2 text-gray-600 dark:text-gray-400 
          hover:text-primary dark:hover:text-primary 
          transition-colors"
        title={isMuted ? "Activar sonido" : "Silenciar"}
        aria-label={isMuted ? "Activar sonido" : "Silenciar"}
        type="button"
      >
        <VolumeIcon className="w-5 h-5" />
      </button>
      
      {showVolumeSlider && (
        <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-background border border-border rounded-lg shadow-lg p-3 w-24 z-50">
          <Slider
            defaultValue={validVolume}
            max={100}
            step={1}
            value={validVolume}
            onValueChange={handleSliderChange}
            orientation="vertical"
            className="h-24"
            aria-label="Volumen"
          />
        </div>
      )}
    </div>
  );
}
