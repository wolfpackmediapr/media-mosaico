
import React from 'react';
import { AudioPlayerHeader } from './AudioPlayerHeader';
import { ProgressBar } from './ProgressBar';
import { AudioPlayerControls } from './AudioPlayerControls';
import { formatTime } from './utils/timeFormatter';
import { Card, CardContent } from "@/components/ui/card";
import { useAudioPlayer } from './hooks/useAudioPlayer';
import type { AudioPlayerProps } from './types';

export const AudioPlayer = ({ file, onEnded }: AudioPlayerProps) => {
  const {
    isPlaying,
    currentTime,
    duration,
    isMuted,
    volume,
    playbackRate,
    handlePlayPause,
    handleSeek,
    handleSkip,
    handleToggleMute,
    handleVolumeChange,
    handlePlaybackRateChange
  } = useAudioPlayer({ file, onEnded });

  // Ensure volume is always in array format
  const volumeArray = Array.isArray(volume) ? volume : [volume * 100];

  // Wrapper for volume change that accepts number arrays
  // Add explicit type annotation to match expected parameter type
  const handleVolumeChangeWrapper = (newVolume: number[]) => {
    // Fixed type error: using type assertion to tell TypeScript 
    // that we know what we're doing with the volume format
    handleVolumeChange(newVolume as any);
  };

  // Wrapper for skip to handle the format discrepancy
  const handleSkipWrapper = (direction: 'forward' | 'backward', amount?: number) => {
    handleSkip(direction, amount);
  };

  // Wrapper for playback rate change to handle the different function signature
  const handlePlaybackRateChangeWrapper = () => {
    // Get next playback rate in the sequence: 0.5 -> 1 -> 1.5 -> 2 -> 0.5
    const rates = [0.5, 1, 1.5, 2];
    const currentIndex = rates.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % rates.length;
    handlePlaybackRateChange(rates[nextIndex]);
  };

  const handleSeekWithClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    handleSeek(percentage * duration);
  };

  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <AudioPlayerHeader fileName={file.name} />
        
        <ProgressBar
          progress={currentTime}
          duration={duration}
          onSeek={handleSeekWithClick}
          formatTime={formatTime}
        />
        
        <AudioPlayerControls
          isPlaying={isPlaying}
          playbackControls={{
            handlePlayPause,
            handleSeek,
            handleSkip: handleSkipWrapper
          }}
          volumeControls={{
            isMuted,
            volume: volumeArray,
            handleVolumeChange: handleVolumeChangeWrapper,
            toggleMute: handleToggleMute
          }}
          playbackRate={playbackRate}
          onChangePlaybackRate={handlePlaybackRateChangeWrapper}
        />
      </CardContent>
    </Card>
  );
};
