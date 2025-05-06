
import React from 'react';
import { ProgressBar as GenericProgressBar } from '@/components/ui/audio-player/ProgressBar';
import { ProgressDisplay } from '@/components/ui/audio-player/ProgressDisplay';
import { formatTime } from './utils/timeFormatter';

interface ProgressBarProps {
  progress: number;
  duration: number;
  onSeek: (e: React.MouseEvent<HTMLDivElement>) => void;
  formatTime: (seconds: number) => string;
}

export function ProgressBar({ progress, duration, onSeek, formatTime }: ProgressBarProps) {
  // Adapter function to match interfaces
  const handleSeek = (time: number) => {
    // Since our new component takes a direct time value instead of event
    // We create a mock event object to satisfy the original interface
    const mockEvent = {
      currentTarget: document.createElement('div'),
      clientX: 0
    } as unknown as React.MouseEvent<HTMLDivElement>;
    
    onSeek(mockEvent);
  };
  
  return (
    <div className="mb-4">
      <GenericProgressBar
        progress={progress}
        duration={duration}
        onSeek={handleSeek}
      />
      
      <div className="flex justify-end mt-1">
        <ProgressDisplay
          currentTime={progress}
          duration={duration}
          formatTime={formatTime}
        />
      </div>
    </div>
  );
}
