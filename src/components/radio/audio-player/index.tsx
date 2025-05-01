
import React from 'react';
import { AudioPlayerHeader } from './AudioPlayerHeader';
import { ProgressBar } from './ProgressBar';
import { AudioPlayerControls } from './AudioPlayerControls';
import { formatTime } from './utils/timeFormatter';
import { Card, CardContent } from "@/components/ui/card";
import { useAudioPlayer } from './hooks/useAudioPlayer';
import { AudioPlayerProps } from './types';
import { UploadedFile } from "@/components/radio/types"; // Import UploadedFile
import EnhancedErrorBoundary from '@/components/common/EnhancedErrorBoundary';

// Extend AudioPlayerProps to use UploadedFile
interface EnhancedAudioPlayerProps extends Omit<AudioPlayerProps, 'file'> {
  file: UploadedFile;
}

export const AudioPlayer = ({ file, onEnded, onError }: EnhancedAudioPlayerProps) => {
  const {
    isPlaying,
    currentTime,
    duration,
    isMuted,
    volume, // This can be number[] from useAudioPlayer
    playbackRate,
    audioError, // Get error state
    audioKey,
    handlePlayPause,
    handleSeek,
    handleSkip,
    handleToggleMute,
    handleVolumeChange,
    handlePlaybackRateChange
  } = useAudioPlayer({ file, onEnded, onError }); // Pass onError

  const handleSeekWithClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    handleSeek(percentage * duration);
  };

  // Display error message if present
  if (audioError) {
    console.error('[AudioPlayer] Error with audio file:', audioError);
    return (
      <Card className="w-full border-destructive">
        <CardContent className="p-4 text-center text-destructive">
          <p className="font-semibold">Audio Error</p>
          <p className="text-sm">{audioError}</p>
        </CardContent>
      </Card>
    );
  }

  // Use a unique key to force re-render of the player when the file changes
  const playerKey = audioKey || `${file.name}-${file.size}`;

  return (
    <EnhancedErrorBoundary componentName="AudioPlayer">
      <Card className="w-full" key={playerKey}>
        <CardContent className="p-4">
          <AudioPlayerHeader fileName={file.name || "Audio File"} /> {/* Added fallback for name */}

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
              handleSkip
            }}
            volumeControls={{
              isMuted,
              volume, // Pass volume as is (can be number[] from useVolumeControls)
              handleVolumeChange,
              toggleMute: handleToggleMute
            }}
            playbackRate={playbackRate}
            onChangePlaybackRate={handlePlaybackRateChange}
          />
        </CardContent>
      </Card>
    </EnhancedErrorBoundary>
  );
};
