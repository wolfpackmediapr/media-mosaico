
import React, { useCallback } from 'react';
import { useAudioDebounce } from '@/hooks/useAudioDebounce';

interface ProgressBarProps {
  progress: number;
  duration: number;
  onSeek: (time: number) => void;
  color?: string;
  height?: string;
  showThumb?: boolean;
}

export function ProgressBar({
  progress,
  duration,
  onSeek,
  color = "#3B82F6",
  height = "h-1.5",
  showThumb = false
}: ProgressBarProps) {
  const { debounce } = useAudioDebounce();
  const progressPercentage = duration > 0 ? (progress / duration) * 100 : 0;
  
  // Debounced seek handler to prevent rapid seeking
  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const handleSeekInner = debounce((e: React.MouseEvent<HTMLDivElement>) => {
      try {
        const container = e.currentTarget;
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = x / rect.width;
        const newTime = percentage * duration;
        onSeek(newTime);
      } catch (err) {
        console.error('[ProgressBar] Error during seek:', err);
      }
    }, 'progress-seek', 50);
    
    handleSeekInner(e);
  }, [duration, onSeek, debounce]);
  
  // Handle touch events for mobile
  const handleTouchSeek = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    const handleTouchSeekInner = debounce((e: React.TouchEvent<HTMLDivElement>) => {
      try {
        const container = e.currentTarget;
        const rect = container.getBoundingClientRect();
        const touch = e.touches[0];
        const x = touch.clientX - rect.left;
        const percentage = x / rect.width;
        const newTime = percentage * duration;
        onSeek(newTime);
      } catch (err) {
        console.error('[ProgressBar] Error during touch seek:', err);
      }
    }, 'progress-touch-seek', 50);
    
    handleTouchSeekInner(e);
  }, [duration, onSeek, debounce]);

  return (
    <div 
      className={`w-full ${height} bg-muted rounded-full mb-2 cursor-pointer relative`}
      onClick={handleSeek}
      onTouchMove={handleTouchSeek}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={progressPercentage}
    >
      <div 
        className={`h-full rounded-full transition-all duration-100`} 
        style={{ 
          width: `${progressPercentage}%`,
          backgroundColor: color 
        }}
      />
      
      {showThumb && (
        <div 
          className="absolute top-1/2 transform -translate-y-1/2 rounded-full bg-white shadow-md border border-gray-200"
          style={{ 
            left: `${progressPercentage}%`, 
            width: '10px', 
            height: '10px',
            marginLeft: '-5px',
            display: progressPercentage > 0 ? 'block' : 'none'
          }}
        />
      )}
    </div>
  );
}
