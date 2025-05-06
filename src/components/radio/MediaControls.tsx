
import { CompactMusicCard } from "@/components/ui/audio-player/CompactMusicCard";
import { useCallback } from "react";
import { AudioMetadataDisplay, AudioPlayerState, AudioControls } from "@/types/player";

interface UploadedFile extends File {
  preview?: string;
}

interface MediaControlsProps extends AudioPlayerState, AudioControls {
  currentFile?: UploadedFile;
  metadata?: AudioMetadataDisplay;
}

const MediaControls = ({
  currentFile,
  metadata,
  isPlaying,
  currentTime,
  duration,
  isMuted,
  volume,
  playbackRate,
  onPlayPause,
  onSeek,
  onSkip,
  onToggleMute,
  onVolumeChange,
  onPlaybackRateChange
}: MediaControlsProps) => {
  if (!currentFile) return null;

  // Using the Publimedia green color (#66cc00)
  const publimediaGreen = "#66cc00";
  
  // Create a memoized wrapper for playback rate change to handle cycling through rates
  const handlePlaybackRateChange = useCallback(() => {
    // Calculate next rate (0.5 -> 1.0 -> 1.5 -> 2.0 -> 0.5)
    const nextRate = playbackRate >= 2 ? 0.5 : playbackRate + 0.5;
    onPlaybackRateChange(nextRate);
  }, [playbackRate, onPlaybackRateChange]);

  return (
    <CompactMusicCard
      title={currentFile.name}
      artist={metadata?.emisora || 'Radio Transcription'}
      mainColor={publimediaGreen}
      isPlaying={isPlaying}
      currentTime={currentTime}
      duration={duration}
      isMuted={isMuted}
      volume={volume}
      playbackRate={playbackRate}
      onPlayPause={onPlayPause}
      onSeek={onSeek}
      onSkip={onSkip}
      onToggleMute={onToggleMute}
      onVolumeChange={onVolumeChange}
      onPlaybackRateChange={handlePlaybackRateChange}
    />
  );
};

export default MediaControls;
