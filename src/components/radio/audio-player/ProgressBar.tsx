
import React from 'react';

interface ProgressBarProps {
  progress: number;
  duration: number;
  onSeek: (e: React.MouseEvent<HTMLDivElement>) => void;
  formatTime: (seconds: number) => string;
}

export function ProgressBar({ progress, duration, onSeek, formatTime }: ProgressBarProps) {
  return (
    <div className="mb-4 px-2">
      <div
        className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full cursor-pointer group"
        onClick={onSeek}
      >
        <div
          className="h-full bg-primary rounded-full relative"
          style={{ width: `${(progress / duration) * 100}%` }}
        >
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 
            bg-primary rounded-full shadow-md transform scale-0 
            group-hover:scale-100 transition-transform"
          />
        </div>
      </div>
      <div className="flex justify-between mt-1 text-xs text-gray-500 dark:text-gray-400">
        <span>{formatTime(progress)}</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  );
}
