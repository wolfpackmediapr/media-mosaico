
import { useEffect } from "react";
import { useAudioProcessing } from "./useAudioProcessing";
import { useAudioStateSync } from "./useAudioStateSync";
import { UploadedFile } from "@/components/radio/types";
import { ensureUiVolumeFormat } from "@/utils/audio-volume-adapter";

interface RadioPlayerOptions {
  currentFile: UploadedFile | null;
  isActiveMediaRoute?: boolean;
  isMediaPlaying?: boolean;
  setIsMediaPlaying?: (isPlaying: boolean) => void;
  persistedText?: string;
  transcriptionText?: string;
  setTranscriptionText?: (text: string) => void;
  onTextChange?: (text: string) => void;
  preferNativeAudio?: boolean; // New option to control native audio preference
}

export const useRadioPlayer = ({
  currentFile,
  isActiveMediaRoute = true,
  isMediaPlaying = false,
  setIsMediaPlaying = () => {},
  persistedText = "",
  transcriptionText = "",
  setTranscriptionText = () => {},
  onTextChange,
  preferNativeAudio = true // Default to preferring native audio
}: RadioPlayerOptions) => {
  // Handle audio state sync
  useAudioStateSync({
    persistedText,
    transcriptionText,
    setTranscriptionText,
    onTextChange
  });

  // Audio processing with persistence support
  const {
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    playbackRate,
    playbackErrors,
    isUsingNativeAudio, // Now exposed from useAudioProcessing
    handlePlayPause,
    handleSeek,
    handleSkip,
    handleToggleMute,
    handleVolumeChange,
    handlePlaybackRateChange,
    handleSeekToSegment,
    switchToNativeAudio,
    switchToHowler,
  } = useAudioProcessing({
    currentFile,
    isActiveMediaRoute,
    externalIsPlaying: isMediaPlaying,
    onPlayingChange: setIsMediaPlaying,
    preferNativeAudio // Pass through the preference
  });

  // Log any playback errors
  useEffect(() => {
    if (playbackErrors) {
      console.error("[useRadioPlayer] Audio playback error:", playbackErrors);
    }
  }, [playbackErrors]);

  return {
    isPlaying,
    currentTime,
    duration,
    volume: ensureUiVolumeFormat(volume), // Ensure consistent volume format
    isMuted,
    playbackRate,
    playbackErrors,
    isUsingNativeAudio, // Expose this so components can know which player is active
    handlePlayPause,
    handleSeek,
    handleSkip,
    handleToggleMute,
    handleVolumeChange,
    handlePlaybackRateChange,
    handleSeekToSegment,
    switchToNativeAudio,
    switchToHowler,
  };
};
