
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
}

export const useRadioPlayer = ({
  currentFile,
  isActiveMediaRoute = true,
  isMediaPlaying = false,
  setIsMediaPlaying = () => {},
  persistedText = "",
  transcriptionText = "",
  setTranscriptionText = () => {},
  onTextChange
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
    handlePlayPause,
    handleSeek,
    handleSkip,
    handleToggleMute,
    handleVolumeChange,
    handlePlaybackRateChange,
    handleSeekToSegment,
    switchToNativeAudio, // Add this to expose the native audio switch functionality
  } = useAudioProcessing({
    currentFile,
    isActiveMediaRoute,
    externalIsPlaying: isMediaPlaying,
    onPlayingChange: setIsMediaPlaying
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
    handlePlayPause,
    handleSeek,
    handleSkip,
    handleToggleMute,
    handleVolumeChange,
    handlePlaybackRateChange,
    handleSeekToSegment,
    switchToNativeAudio, // Expose this function
  };
};
