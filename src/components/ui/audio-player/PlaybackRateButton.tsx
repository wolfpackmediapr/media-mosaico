
import React, { useCallback } from 'react';
import { useAudioDebounce } from '@/hooks/useAudioDebounce';

interface PlaybackRateButtonProps {
  playbackRate: number;
  onChange: () => void;
  availableRates?: number[];
}

export function PlaybackRateButton({
  playbackRate,
  onChange,
  availableRates = [0.5, 1, 1.5, 2]
}: PlaybackRateButtonProps) {
  const { debounce } = useAudioDebounce();
  
  // Prevent rapid clicks
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    debounce(() => {
      onChange();
    }, 'playback-rate-change', 300);
  }, [onChange, debounce]);
  
  // Figure out next rate for the tooltip
  const currentIndex = availableRates.indexOf(playbackRate);
  const nextRate = availableRates[(currentIndex + 1) % availableRates.length];
  
  return (
    <button 
      onClick={handleClick}
      className="p-2 text-gray-600 dark:text-gray-400 
        hover:text-primary dark:hover:text-primary 
        transition-colors font-mono text-sm"
      title={`Speed: ${playbackRate}x (Click for ${nextRate}x)`}
      aria-label={`Change playback speed, currently ${playbackRate}x`}
      type="button"
    >
      {playbackRate}x
    </button>
  );
}
