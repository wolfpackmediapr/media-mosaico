
import React, { useCallback } from "react";
import { MusicCard } from "@/components/ui/music-card";
import { AudioMetadataDisplay, AudioPlayerState, AudioControls } from "@/types/player";

interface UploadedFile extends File {
  preview?: string;
}

interface MediaControlsProps extends AudioPlayerState, AudioControls {
  currentFile?: UploadedFile;
  metadata?: AudioMetadataDisplay;
  playbackErrors?: string | null;  // Added to match what RightSection is passing
  isFileValid?: boolean;          // Added to match what RightSection is passing
  onSwitchToNative?: () => void;  // Added to match what RightSection is passing
  className?: string;             // Added to support class name customization
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
  playbackErrors,
  isFileValid = true,
  onPlayPause,
  onSeek,
  onSkip,
  onToggleMute,
  onVolumeChange,
  onPlaybackRateChange,
  onSwitchToNative,
  className = ""
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

  // Show error indicator or warning if file is not valid
  const showErrorIndicator = !!playbackErrors || !isFileValid;
  
  return (
    <MusicCard
      file={currentFile}
      title={currentFile.name}
      artist={metadata?.emisora || 'Radio Transcription'}
      mainColor={publimediaGreen}
      customControls={true}
      isPlaying={isPlaying}
      currentTime={currentTime}
      duration={duration}
      isMuted={isMuted}
      volume={Array.isArray(volume) ? volume : [volume * 100]}
      playbackRate={playbackRate}
      onPlayPause={onPlayPause}
      onSeek={onSeek}
      onSkip={onSkip}
      onToggleMute={onToggleMute}
      onVolumeChange={onVolumeChange}
      onPlaybackRateChange={handlePlaybackRateChange}
      error={showErrorIndicator ? (playbackErrors || "Error al reproducir este archivo") : undefined}
      onSwitchPlayback={onSwitchToNative}
      className={className}
    />
  );
};

export default MediaControls;
