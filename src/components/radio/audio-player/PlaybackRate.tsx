
import React from 'react';

interface PlaybackRateProps {
  rate: number;
  onChange: () => void;
}

export function PlaybackRate({ rate, onChange }: PlaybackRateProps) {
  return (
    <button
      onClick={onChange}
      className="px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-700 
        text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-primary 
        transition-colors"
      title="Cambiar velocidad de reproducción"
    >
      {rate}x
    </button>
  );
}
