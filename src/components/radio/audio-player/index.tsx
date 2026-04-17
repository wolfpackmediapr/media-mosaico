
import React from 'react';
import { AudioPlayerHeader } from './AudioPlayerHeader';
import { ProgressBar } from './ProgressBar';
import { AudioPlayerControls } from './AudioPlayerControls';
import { formatTime } from './utils/timeFormatter';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Minimize2, PictureInPicture2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAudioPlayer } from './hooks/useAudioPlayer';
import { useStickyState } from '@/hooks/use-sticky-state';
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

  // Sticky / floating PiP-style mode (mirrors TV VideoPlayer pattern)
  const { isSticky, stickyRef, toggleSticky } = useStickyState({
    persistKey: `radio-audio-sticky-${file.name?.substring(0, 30) || 'default'}`,
    defaultSticky: false,
    storage: 'sessionStorage'
  });

  // Ensure volume is always in array format
  const volumeArray = Array.isArray(volume) ? volume : [volume * 100];

  // Wrapper for volume change that accepts number arrays
  const handleVolumeChangeWrapper = (newVolume: number[]) => {
    handleVolumeChange(newVolume);
  };

  // Wrapper for skip to handle the format discrepancy
  const handleSkipWrapper = (direction: 'forward' | 'backward', amount?: number) => {
    handleSkip(direction, amount);
  };

  // Wrapper for playback rate change to handle the different function signature
  const handlePlaybackRateChangeWrapper = () => {
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
    <div
      ref={stickyRef}
      className={cn(
        "transition-all",
        isSticky &&
          "fixed bottom-4 right-4 w-[22rem] max-w-[calc(100vw-2rem)] z-50 shadow-2xl animate-in slide-in-from-bottom-4"
      )}
    >
      <Card className={cn("w-full", isSticky && "border-primary/40 bg-background/95 backdrop-blur")}>
        <CardContent className={cn("p-4", isSticky && "p-3")}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <AudioPlayerHeader fileName={file.name} />
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSticky}
              className="h-7 w-7 shrink-0"
              title={isSticky ? "Restaurar reproductor" : "Modo flotante"}
              aria-label={isSticky ? "Restaurar reproductor" : "Activar modo flotante"}
            >
              {isSticky ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <PictureInPicture2 className="h-4 w-4" />
              )}
            </Button>
          </div>

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
    </div>
  );
};
