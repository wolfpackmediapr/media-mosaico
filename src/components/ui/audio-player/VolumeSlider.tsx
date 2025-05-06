
import React, { useState } from 'react';
import { Volume1, Volume2, VolumeX } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { useAudioDebounce } from '@/hooks/useAudioDebounce';
import { ensureUiVolumeFormat, ensureAudioVolumeFormat } from '@/utils/audio-volume-adapter';

interface VolumeSliderProps {
  volume: number | number[];
  isMuted: boolean;
  onVolumeChange: (value: number[]) => void;
  onToggleMute: () => void;
  showSliderOnHover?: boolean;
}

export function VolumeSlider({ 
  volume, 
  isMuted, 
  onVolumeChange, 
  onToggleMute,
  showSliderOnHover = true
}: VolumeSliderProps) {
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const { debounce } = useAudioDebounce();
  
  // Ensure volume is always in array format with valid values
  const safeVolume = ensureUiVolumeFormat(volume);
  
  // Select the appropriate icon based on volume level and mute state
  const volumeValue = safeVolume[0];
  const VolumeIcon = isMuted ? VolumeX : volumeValue < 50 ? Volume1 : Volume2;

  // Debounce volume changes to prevent excessive updates
  const debouncedVolumeChange = debounce((newVolume: number[]) => {
    if (Array.isArray(newVolume) && newVolume.length > 0) {
      onVolumeChange(newVolume);
    }
  }, 'volume-change', 50); // 50ms debounce

  // Enhanced mute handler with debounce protection
  const handleMuteClick = debounce((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onToggleMute();
  }, 'toggle-mute', 300); // 300ms protection

  return (
    <div className={`relative ${showSliderOnHover ? 'group' : ''}`}
      onMouseEnter={() => showSliderOnHover && setShowVolumeSlider(true)} 
      onMouseLeave={() => showSliderOnHover && setShowVolumeSlider(false)}
      onTouchStart={() => showSliderOnHover && setShowVolumeSlider(true)}
    >
      <button
        onClick={handleMuteClick}
        className="p-2 text-gray-600 dark:text-gray-400 
          hover:text-primary dark:hover:text-primary 
          transition-colors"
        title={isMuted ? "Activate sound" : "Mute"}
        aria-label={isMuted ? "Activate sound" : "Mute"}
        type="button"
      >
        <VolumeIcon className="w-5 h-5" />
      </button>
      
      {(showVolumeSlider || !showSliderOnHover) && (
        <div className={`${showSliderOnHover ? 'absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2' : ''} 
          bg-background border border-border rounded-lg shadow-lg p-3 w-24 z-50`}>
          <Slider
            defaultValue={safeVolume}
            max={100}
            step={1}
            value={safeVolume}
            onValueChange={debouncedVolumeChange}
            orientation={showSliderOnHover ? "vertical" : "horizontal"}
            className={showSliderOnHover ? "h-24" : "w-full"}
            aria-label="Volume"
          />
        </div>
      )}
    </div>
  );
}
