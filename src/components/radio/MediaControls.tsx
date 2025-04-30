
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AudioPlayerHeader } from './audio-player/AudioPlayerHeader';
import { ProgressBar } from './audio-player/ProgressBar';
import { AudioPlayerControls } from './audio-player/AudioPlayerControls';
import { formatTime } from './audio-player/utils/timeFormatter';
import { UploadedFile } from './types';

interface MediaControlsProps {
  currentFile: UploadedFile;
  metadata: any; // Use a more specific type if available
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isMuted: boolean;
  volume: number; // Changed to number
  playbackRate: number;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onSkip: (direction: 'forward' | 'backward', amount?: number) => void;
  onToggleMute: () => void;
  onVolumeChange: (value: number | number[]) => void; // Keep accepting array for slider
  onPlaybackRateChange: () => void;
}

const MediaControls: React.FC<MediaControlsProps> = ({
  currentFile,
  metadata,
  isPlaying,
  currentTime,
  duration,
  isMuted,
  volume, // is number
  playbackRate,
  onPlayPause,
  onSeek,
  onSkip,
  onToggleMute,
  onVolumeChange,
  onPlaybackRateChange,
}) => {

  const handleSeekWithClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    onSeek(percentage * duration);
  };

  // Debug logging for audio source info
  React.useEffect(() => {
    if (currentFile) {
      console.log(`[MediaControls] Current file info:`, {
        name: currentFile.name,
        type: currentFile.type,
        remoteUrl: currentFile.remoteUrl || 'N/A',
        preview: currentFile.preview ? 'Has preview URL' : 'No preview URL',
        size: `${(currentFile.size / (1024 * 1024)).toFixed(2)} MB`
      });
    }
  }, [currentFile]);

  return (
    <Card className="w-full">
       {/* Use AudioPlayerHeader or create a specific header */}
      <AudioPlayerHeader fileName={currentFile.name || "Audio File"} />
      <CardContent className="p-4">

        <ProgressBar
          progress={currentTime}
          duration={duration}
          onSeek={handleSeekWithClick}
          formatTime={formatTime}
        />

        <AudioPlayerControls
          isPlaying={isPlaying}
          playbackControls={{
            handlePlayPause: onPlayPause,
            handleSeek: onSeek, // Or remove if progress bar handles it
            handleSkip: onSkip
          }}
          volumeControls={{
            isMuted,
            volume, // Pass number volume
            handleVolumeChange: onVolumeChange,
            toggleMute: onToggleMute
          }}
          playbackRate={playbackRate}
          onChangePlaybackRate={onPlaybackRateChange}
        />
      </CardContent>
    </Card>
  );
};

export default MediaControls;
