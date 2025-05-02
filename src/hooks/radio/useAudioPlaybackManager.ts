
import { useCallback, useState } from "react";
import { useRadioPlayer } from "./useRadioPlayer";
import { UploadedFile } from "@/components/radio/types";
import { RadioNewsSegment } from "@/components/radio/RadioNewsSegmentsContainer";
import { ensureUiVolumeFormat, uiVolumeToAudioVolume } from "@/utils/audio-volume-adapter";

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

  // Volume wrapper: Handle the type compatibility issue
  const onVolumeChange = useCallback((value: number[]) => {
    if (Array.isArray(value) && value.length > 0) {
      // First, ensure we're working with a proper UI volume format (array of numbers)
      const uiVolume = ensureUiVolumeFormat(value);
      
      // Then call handleVolumeChange with the properly formatted volume
      // This addresses the type mismatch by using the proper format expected by handleVolumeChange
      handleVolumeChange(uiVolume);
    } else {
      // Default to [0] if value is invalid, properly formatted for handleVolumeChange
      handleVolumeChange([0]);
    }
  }, [handleVolumeChange]);

  // Add volume up/down handlers that correctly handle array types
  const handleVolumeUp = useCallback(() => {
    // Ensure we have a proper UI volume array
    const currentVolumeArray = ensureUiVolumeFormat(volume);
    // Calculate new volume, ensuring it doesn't exceed 100
    const newVolume = Math.min(100, currentVolumeArray[0] + 5);
    // Pass as array to match expected type
    onVolumeChange([newVolume]);
  }, [volume, onVolumeChange]);

  const handleVolumeDown = useCallback(() => {
    // Ensure we have a proper UI volume array
    const currentVolumeArray = ensureUiVolumeFormat(volume);
    // Calculate new volume, ensuring it doesn't go below 0
    const newVolume = Math.max(0, currentVolumeArray[0] - 5);
    // Pass as array to match expected type
    onVolumeChange([newVolume]);
  }, [volume, onVolumeChange]);

  return {
    // Player state
    isPlaying,
    currentTime,
    duration,
    volume: ensureUiVolumeFormat(volume), // Ensure volume is always in UI format
    isMuted,
    playbackRate,
    playbackErrors,
    // Player controls
    handlePlayPause,
    handleSeek,
    handleSkip,
    handleToggleMute,
    handleVolumeChange: onVolumeChange, // Use the adapter for volume conversion
    handlePlaybackRateChange,
    handleVolumeUp,
    handleVolumeDown,
    seekToSegment, // Renamed for clarity
  };
};
