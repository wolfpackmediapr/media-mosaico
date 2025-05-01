
import React from 'react';
import { AudioPlayerHeader } from './AudioPlayerHeader';
import { ProgressBar } from './ProgressBar';
import { AudioPlayerControls } from './AudioPlayerControls';
import { formatTime } from './utils/timeFormatter';
import { Card, CardContent } from "@/components/ui/card";
import { useAudioPlayer } from './hooks/useAudioPlayer';
import { AudioPlayerProps } from './types';

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

  // Convert volume number to array format expected by components
  const volumeArray = Array.isArray(volume) ? volume : [volume * 100];

  // Wrapper for volume change to convert between array and number
  const handleVolumeChangeWrapper = (newVolume: number[]) => {
    handleVolumeChange(newVolume[0] / 100);
  };

  // Wrapper for skip to handle the format discrepancy
  const handleSkipWrapper = (direction: 'forward' | 'backward', amount?: number) => {
    handleSkip(direction, amount);
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
          onChangePlaybackRate={handlePlaybackRateChange}
        />
      </CardContent>
    </Card>
  );
};
