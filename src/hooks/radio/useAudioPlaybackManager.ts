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

  // Volume wrapper: Receives number[] (0-100) from UI, calls handler expecting number (0-1)
  const onVolumeChange = useCallback((value: number[]) => {
    if (Array.isArray(value) && value.length > 0) {
      // Convert slider value (e.g., 50) to volume scale (e.g., 0.5)
      const volumeLevel = value[0] / 100;
      // Ensure volume is within 0-1 range
      const clampedVolume = Math.max(0, Math.min(1, volumeLevel));
       // Call the underlying handler with the expected number type
      // The 'as any' is a workaround for the incorrect intersection type (number & number[]) reported by TS.
      // We are confident the underlying function actually expects 'number'.
      (handleVolumeChange as any)(clampedVolume);
    } else {
       // Default to 0 if value is invalid
      (handleVolumeChange as any)(0);
    }
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
    handleVolumeChange: onVolumeChange, // Use the corrected wrapper
    handlePlaybackRateChange,
    seekToSegment, // Renamed for clarity
  };
};
