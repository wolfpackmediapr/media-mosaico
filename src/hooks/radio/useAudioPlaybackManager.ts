
import { useCallback } from "react";
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
    volume, // This is likely number | number[] coming from useRadioPlayer
    isMuted,
    playbackRate,
    playbackErrors,
    handlePlayPause,
    handleSeek,
    handleSkip,
    handleToggleMute,
    handleVolumeChange: baseHandleVolumeChange, // Rename to avoid conflict
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

  // Volume wrapper: Fix the type issue by explicitly handling the types
  const onVolumeChange = useCallback((value: number[]) => {
    // Ensure we always start with a correctly formatted UI volume array [0-100]
    const uiVolume = ensureUiVolumeFormat(value); 
    
    // Convert UI volume (0-100) to audio engine volume (0-1)
    const audioVolume = uiVolumeToAudioVolume(uiVolume); 
    
    // Call baseHandleVolumeChange with the converted audio engine volume (number 0-1)
    // We need to cast this to any to avoid the TypeScript error as baseHandleVolumeChange
    // seems to expect both number and number[] types
    baseHandleVolumeChange(audioVolume as any); 
  }, [baseHandleVolumeChange]);

  // Add volume up/down handlers that correctly handle array types
  const handleVolumeUp = useCallback(() => {
    // Ensure we start with a proper UI volume array [0-100]
    const currentVolumeArray = ensureUiVolumeFormat(volume);
    // Calculate new UI volume, ensuring it doesn't exceed 100
    const newVolumeValue = Math.min(100, currentVolumeArray[0] + 5);
    // Pass the new volume as an array [0-100] to the wrapper
    onVolumeChange([newVolumeValue]);
  }, [volume, onVolumeChange]);

  const handleVolumeDown = useCallback(() => {
    // Ensure we start with a proper UI volume array [0-100]
    const currentVolumeArray = ensureUiVolumeFormat(volume);
    // Calculate new UI volume, ensuring it doesn't go below 0
    const newVolumeValue = Math.max(0, currentVolumeArray[0] - 5);
    // Pass the new volume as an array [0-100] to the wrapper
    onVolumeChange([newVolumeValue]);
  }, [volume, onVolumeChange]);

  return {
    // Player state
    isPlaying,
    currentTime,
    duration,
    volume: ensureUiVolumeFormat(volume), // Ensure volume is always in UI format [0-100]
    isMuted,
    playbackRate,
    playbackErrors,
    // Player controls
    handlePlayPause,
    handleSeek,
    handleSkip,
    handleToggleMute,
    handleVolumeChange: onVolumeChange, // Use the wrapper which accepts number[]
    handlePlaybackRateChange,
    handleVolumeUp,
    handleVolumeDown,
    seekToSegment, // Renamed for clarity
  };
};
