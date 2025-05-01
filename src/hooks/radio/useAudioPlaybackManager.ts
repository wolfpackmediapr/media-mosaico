
import { useCallback, useState } from "react";
import { useRadioPlayer } from "./useRadioPlayer";
import { UploadedFile } from "@/components/radio/types";
import { RadioNewsSegment } from "@/components/radio/RadioNewsSegmentsContainer";

interface UseAudioPlaybackManagerProps {
  currentFile: UploadedFile | null;
  isActiveMediaRoute?: boolean;
  isMediaPlaying?: boolean;
  setIsMediaPlaying?: (isPlaying: boolean) => void;
  persistedText?: string;
  transcriptionText?: string;
  setTranscriptionText?: (text: string) => void;
  onTextChange?: (text: string) => void;
}

export const useAudioPlaybackManager = ({
  currentFile,
  isActiveMediaRoute = true,
  isMediaPlaying = false,
  setIsMediaPlaying = () => {},
  persistedText = "",
  transcriptionText = "",
  setTranscriptionText = () => {},
  onTextChange
}: UseAudioPlaybackManagerProps) => {
  // Player state from useRadioPlayer
  const {
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    playbackRate,
    playbackErrors,
    handlePlayPause,
    handleSeek,
    handleSkip,
    handleToggleMute,
    handleVolumeChange,
    handlePlaybackRateChange,
    handleSeekToSegment,
  } = useRadioPlayer({
    currentFile,
    isActiveMediaRoute,
    isMediaPlaying,
    setIsMediaPlaying,
    persistedText,
    transcriptionText,
    setTranscriptionText,
    onTextChange
  });

  // Create wrapper functions with consistent types if needed
  const seekToSegment = useCallback((segmentOrTime: RadioNewsSegment | number) => {
    handleSeekToSegment(segmentOrTime);
  }, [handleSeekToSegment]);

  // Volume wrapper to ensure consistent type handling
  // Fixed to match the expected type signature
  const onVolumeChange = useCallback((value: number[]) => {
    // We know handleVolumeChange can accept number[], so we're just passing it through
    handleVolumeChange(value);
  }, [handleVolumeChange]);

  return {
    // Player state
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    playbackRate,
    playbackErrors,
    // Player controls
    handlePlayPause,
    handleSeek,
    handleSkip,
    handleToggleMute,
    handleVolumeChange: onVolumeChange, // Use the wrapper for consistent typing
    handlePlaybackRateChange,
    seekToSegment, // Renamed for clarity
  };
};
