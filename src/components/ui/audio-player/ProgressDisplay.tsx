
import React from 'react';

interface ProgressDisplayProps {
  currentTime: number;
  duration: number;
  formatTime?: (seconds: number) => string;
}

export function ProgressDisplay({ 
  currentTime, 
  duration,
  formatTime = defaultFormatTime
}: ProgressDisplayProps) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span>{formatTime(currentTime)}</span>
      <span>/</span>
      <span>{formatTime(duration || 0)}</span>
    </div>
  );
}

// Default time formatter (copied from formatTime in utils)
function defaultFormatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
