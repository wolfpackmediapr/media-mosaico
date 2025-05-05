
import React, { useState } from 'react';
import { Volume1, Volume2, VolumeX } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";

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
  
  // Always use the first volume value for icon determination
  const volumeValue = Array.isArray(volume) ? volume[0] : volume;
  const VolumeIcon = isMuted ? VolumeX : volumeValue < 50 ? Volume1 : Volume2;

  return (
    <div className="relative" 
      onMouseEnter={() => setShowVolumeSlider(true)} 
      onMouseLeave={() => setShowVolumeSlider(false)}
    >
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggleMute}
        className="h-8 w-8 text-muted-foreground"
      >
        <VolumeIcon className="h-4 w-4" />
      </Button>
      
      {showVolumeSlider && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 bg-background border border-input rounded-lg shadow-lg p-3 mb-2 z-50">
          <Slider
            value={volume}
            max={100}
            step={1}
            orientation="vertical"
            onValueChange={onVolumeChange}
            className="h-24"
          />
        </div>
      )}
    </div>
  );
}

export default VolumeControls;
