
import { useCallback } from "react";
import { useRadioPlayer } from "./useRadioPlayer";
import { UploadedFile } from "@/components/radio/types";
import { RadioNewsSegment } from "@/components/radio/RadioNewsSegmentsContainer";
import { ensureUiVolumeFormat, uiVolumeToAudioVolume } from "@/utils/audio-volume-adapter";
import { normalizeTimeToSeconds } from "@/components/radio/interactive-transcription/utils";

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
    handlePlayPause: baseHandlePlayPause,
    handleSeek,
    handleSkip,
    handleToggleMute: baseHandleToggleMute,
    handleVolumeChange: baseHandleVolumeChange, // Rename to avoid conflict
    handlePlaybackRateChange,
    handleSeekToSegment,
    switchToNativeAudio, // Add this from the Radio Player
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

  // Enhanced play/pause handler with debugging
  const handlePlayPause = useCallback(() => {
    console.log('[useAudioPlaybackManager] Play/pause triggered, current state:', isPlaying ? 'playing' : 'paused');
    baseHandlePlayPause();
  }, [baseHandlePlayPause, isPlaying]);

  // Enhanced toggle mute handler with debugging
  const handleToggleMute = useCallback(() => {
    console.log('[useAudioPlaybackManager] Toggle mute triggered, current state:', isMuted ? 'muted' : 'unmuted');
    baseHandleToggleMute();
  }, [baseHandleToggleMute, isMuted]);

  // Create wrapper functions with consistent types if needed
  const seekToSegment = useCallback((segmentOrTime: RadioNewsSegment | number) => {
    // IMPROVED: Robust handling of both segment and number types
    if (typeof segmentOrTime === 'number') {
      // It's a timestamp, normalize it to seconds
      const timeInSeconds = normalizeTimeToSeconds(segmentOrTime);
      console.log(`[useAudioPlaybackManager] Seeking to time: ${timeInSeconds.toFixed(2)}s`);
      
      if (isFinite(timeInSeconds) && timeInSeconds >= 0) {
        handleSeekToSegment(timeInSeconds);
      } else {
        console.error(`[useAudioPlaybackManager] Invalid timestamp: ${timeInSeconds}, skipping seek`);
      }
    } else if (segmentOrTime && typeof segmentOrTime.startTime === 'number') {
      // It's a RadioNewsSegment, extract the startTime and normalize it to seconds
      const timeInSeconds = normalizeTimeToSeconds(segmentOrTime.startTime);
      console.log(`[useAudioPlaybackManager] Seeking to segment at: ${timeInSeconds.toFixed(2)}s`);
      
      if (isFinite(timeInSeconds) && timeInSeconds >= 0) {
        handleSeekToSegment(timeInSeconds);
      } else {
        console.error(`[useAudioPlaybackManager] Invalid segment startTime: ${timeInSeconds}, skipping seek`);
      }
    } else {
      console.error('[useAudioPlaybackManager] Invalid segment or time provided for seeking', segmentOrTime);
    }
  }, [handleSeekToSegment]);

  // Volume wrapper: Fix the type issue by explicitly handling the types
  const onVolumeChange = useCallback((value: number[]) => {
    // Log the incoming volume value
    console.log('[useAudioPlaybackManager] Volume change requested:', value);
    
    // Ensure we always start with a correctly formatted UI volume array [0-100]
    const uiVolume = ensureUiVolumeFormat(value); 
    console.log('[useAudioPlaybackManager] Normalized UI volume:', uiVolume);
    
    // Convert UI volume (0-100) to audio engine volume (0-1)
    const audioVolume = uiVolumeToAudioVolume(uiVolume); 
    console.log('[useAudioPlaybackManager] Converted to audio volume (0-1):', audioVolume);
    
    // Call baseHandleVolumeChange with the converted audio engine volume
    // FIX: Wrap the single number value in an array to satisfy TypeScript
    baseHandleVolumeChange([audioVolume]); 
  }, [baseHandleVolumeChange]);

  // Add volume up/down handlers that correctly handle array types
  const handleVolumeUp = useCallback(() => {
    // Ensure we start with a proper UI volume array [0-100]
    const currentVolumeArray = ensureUiVolumeFormat(volume);
    // Calculate new UI volume, ensuring it doesn't exceed 100
    const newVolumeValue = Math.min(100, currentVolumeArray[0] + 5);
    console.log(`[useAudioPlaybackManager] Volume up: ${currentVolumeArray[0]} -> ${newVolumeValue}`);
    // Pass the new volume as an array [0-100] to the wrapper
    onVolumeChange([newVolumeValue]);
  }, [volume, onVolumeChange]);

  const handleVolumeDown = useCallback(() => {
    // Ensure we start with a proper UI volume array [0-100]
    const currentVolumeArray = ensureUiVolumeFormat(volume);
    // Calculate new UI volume, ensuring it doesn't go below 0
    const newVolumeValue = Math.max(0, currentVolumeArray[0] - 5);
    console.log(`[useAudioPlaybackManager] Volume down: ${currentVolumeArray[0]} -> ${newVolumeValue}`);
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
    switchToNativeAudio, // Add the ability to switch to native audio
  };
};
