
import { useCallback } from "react";
import { useRadioPlayer } from "./useRadioPlayer";
import { UploadedFile } from "@/components/radio/types";
import { RadioNewsSegment } from "@/components/radio/RadioNewsSegmentsContainer";

interface AudioPlaybackManagerOptions {
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
}: AudioPlaybackManagerOptions) => {
  const {
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    playbackRate,
    playbackErrors,
    isUsingNativeAudio,
    handlePlayPause,
    handleSeek,
    handleSkip,
    handleToggleMute,
    handleVolumeChange,
    handlePlaybackRateChange,
    handleSeekToSegment: rawHandleSeekToSegment,
    switchToNativeAudio,
    switchToHowler,
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

  // Enhanced segment seeking - handle both number and segment objects
  const seekToSegment = useCallback((segmentOrTime: RadioNewsSegment | number) => {
    if (typeof segmentOrTime === 'number') {
      // Direct time in seconds
      handleSeek(segmentOrTime);
    } else {
      // Handle segment object
      rawHandleSeekToSegment(segmentOrTime);
    }
  }, [handleSeek, rawHandleSeekToSegment]);

  return {
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
    seekToSegment,
    switchToNativeAudio,
    switchToHowler
  };
};
