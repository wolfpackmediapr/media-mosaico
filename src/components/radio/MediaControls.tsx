
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AudioPlayerHeader } from './audio-player/AudioPlayerHeader';
import { ProgressBar } from './audio-player/ProgressBar';
import { AudioPlayerControls } from './audio-player/AudioPlayerControls';
import { formatTime } from './audio-player/utils/timeFormatter';
import { UploadedFile } from './types';
import { MusicCard } from '@/components/ui/music-card'; // Import MusicCard component

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

  // Format the title and artist for MusicCard from metadata
  const title = currentFile?.name || "Audio File";
  const artist = metadata?.emisora || metadata?.programa || "Radio Transcription";
  
  // Publimedia brand green color
  const brandGreen = "#66cc00";

  return (
    <MusicCard
      title={title}
      artist={artist}
      mainColor={brandGreen}
      customControls={true}
      isPlaying={isPlaying}
      currentTime={currentTime}
      duration={duration}
      isMuted={isMuted}
      volume={[volume]} // Convert number to array for MusicCard
      playbackRate={playbackRate}
      onPlayPause={onPlayPause}
      onSeek={onSeek}
      onSkip={onSkip}
      onToggleMute={onToggleMute}
      onVolumeChange={(val) => {
        // Handle array conversion - MusicCard passes array but our handlers expect number or array
        if (Array.isArray(val) && val.length > 0) {
          onVolumeChange(val[0]);
        } else {
          onVolumeChange(val);
        }
      }}
      onPlaybackRateChange={onPlaybackRateChange}
    />
  );
};

export default MediaControls;
