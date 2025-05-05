
import React, { useState } from 'react';
import { Volume1, Volume2, VolumeX } from "lucide-react";
import { Slider } from "@/components/ui/slider";

interface VolumeControlsProps {
  isMuted: boolean;
  volume: number[];
  onToggleMute: () => void;
  onVolumeChange: (value: number[]) => void;
}

export function VolumeControls({ 
  isMuted, 
  volume, 
  onToggleMute, 
  onVolumeChange 
}: VolumeControlsProps) {
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  
  // Volume icon changes based on level
  const volumeLevel = Array.isArray(volume) ? volume[0] : volume;
  const VolumeIcon = isMuted ? VolumeX : volumeLevel < 50 ? Volume1 : Volume2;

  return (
    <div className="relative" 
      onMouseEnter={() => setShowVolumeSlider(true)} 
      onMouseLeave={() => setShowVolumeSlider(false)}
    >
      <button
        onClick={onToggleMute}
        className="p-2 text-gray-600 dark:text-gray-400 
          hover:text-primary dark:hover:text-primary 
          transition-colors"
        title={isMuted ? "Activar sonido" : "Silenciar"}
      >
        <VolumeIcon className="w-5 h-5" />
      </button>
      
      {/* Volume slider that appears on hover */}
      {showVolumeSlider && (
        <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-background border border-border rounded-lg shadow-lg p-3 w-24">
          <Slider
            defaultValue={volume}
            max={100}
            step={1}
            value={volume}
            onValueChange={onVolumeChange}
            orientation="vertical"
            className="h-24"
          />
        </div>
      )}
    </div>
  );
}
