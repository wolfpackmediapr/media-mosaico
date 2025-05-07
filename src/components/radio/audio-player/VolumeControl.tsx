
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
  
  // Ensure volume is always in array format with valid values
  const safeVolume = Array.isArray(volume) ? volume : [0];
  // Handle invalid values and ensure we have at least one value
  const validVolume = safeVolume.length > 0 && isFinite(safeVolume[0]) 
    ? safeVolume.map(v => isFinite(v) ? v : 50) 
    : [50];
  
  console.log('[VolumeControl] Current volume:', validVolume);
  
  // Select the appropriate icon based on volume level and mute state
  const volumeValue = validVolume[0];
  const VolumeIcon = isMuted ? VolumeX : volumeValue < 50 ? Volume1 : Volume2;

  // Enhanced event handlers with protection against event bubbling
  const handleMuteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    console.log('[VolumeControl] Mute button clicked, current state:', isMuted ? 'muted' : 'unmuted');
    toggleMute();
  };

  const handleVolumeChangeInternal = (newVolume: number[]) => {
    // Validate before passing to handler
    if (Array.isArray(newVolume) && newVolume.length > 0 && isFinite(newVolume[0])) {
      // Ensure all values in the array are finite
      const validatedVolume = newVolume.map(v => isFinite(v) ? v : 50);
      console.log('[VolumeControl] Volume changed to:', validatedVolume);
      handleVolumeChange(validatedVolume);
    } else {
      // Fallback to default if invalid
      console.warn('[VolumeControl] Received invalid volume value, using default', newVolume);
      handleVolumeChange([50]);
    }
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
            onValueChange={handleVolumeChangeInternal}
            orientation="vertical"
            className="h-24"
            aria-label="Volumen"
          />
        </div>
      )}
    </div>
  );
}
