
import { useState, useEffect } from "react";
import { useAudioPlayer } from "./use-audio-player";
import { RadioNewsSegment } from "@/components/radio/RadioNewsSegmentsContainer";

interface AudioProcessingOptions {
  currentFile: File | null;
  isActiveMediaRoute?: boolean;
  externalIsPlaying?: boolean;
  onPlayingChange?: (isPlaying: boolean) => void;
}

export const useAudioProcessing = ({ 
  currentFile,
  isActiveMediaRoute = true,
  externalIsPlaying = false,
  onPlayingChange = () => {}
}: AudioProcessingOptions) => {
  const [prevPlayingState, setPrevPlayingState] = useState(false);

  const {
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    playbackRate,
    handlePlayPause: originalHandlePlayPause,
    handleSeek,
    handleSkip,
    handleToggleMute,
    handleVolumeChange,
    handlePlaybackRateChange,
    seekToTimestamp,
  } = useAudioPlayer({ 
    file: currentFile || undefined 
  });

  // Sync our playing state with external state
  useEffect(() => {
    // Only update if this is the active media route and the external state has changed
    if (isActiveMediaRoute && externalIsPlaying !== isPlaying) {
      if (externalIsPlaying) {
        // If external state says we should be playing but we're not, try to play
        if (!isPlaying && currentFile) {
          originalHandlePlayPause();
        }
      } else {
        // If external state says we should not be playing but we are, pause
        if (isPlaying) {
          originalHandlePlayPause();
        }
      }
    }
    
    // Save previous playing state to detect changes
    if (isPlaying !== prevPlayingState) {
      setPrevPlayingState(isPlaying);
      // Notify parent about playing state changes
      onPlayingChange(isPlaying);
    }
  }, [isActiveMediaRoute, externalIsPlaying, isPlaying, prevPlayingState, currentFile]);

  // Wrapper for play/pause that also updates external state
  const handlePlayPause = () => {
    originalHandlePlayPause();
    onPlayingChange(!isPlaying);
  };

  // Handler to seek to a specific segment
  const handleSeekToSegment = (segment: RadioNewsSegment) => {
    if (segment.startTime) {
      seekToTimestamp(segment.startTime);
      onPlayingChange(true);
    }
  };

  return {
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    playbackRate,
    handlePlayPause,
    handleSeek,
    handleSkip,
    handleToggleMute,
    handleVolumeChange,
    handlePlaybackRateChange,
    handleSeekToSegment,
  };
};
