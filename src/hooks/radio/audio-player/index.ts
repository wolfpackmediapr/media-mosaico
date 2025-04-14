
import { useRef } from "react";
import { useVisibilityChange } from "@/hooks/use-visibility-change";
import { AudioPlayerOptions } from "./types";
import { useAudioElement } from "./useAudioElement";
import { usePlaybackControls } from "./usePlaybackControls";
import { useAudioSettings } from "./useAudioSettings";
import { useMediaStatePersistence } from "@/hooks/use-media-state-persistence";

export function useAudioPlayer({ 
  file, 
  onTimeUpdate, 
  onDurationChange,
  onError
}: AudioPlayerOptions = {}) {
  // Generate a reference to the audio ID for persistence
  const audioIdRef = useRef<string>(file ? `audio-${file.name}` : "audio-empty");
  
  // Get media persistence for visibility changes
  const { updateTime } = useMediaStatePersistence(audioIdRef.current, {
    mediaType: "audio",
    fileName: file?.name
  });
  
  // Handle audio element creation and lifecycle with improved error handling
  const {
    audioElement,
    isPlaying,
    currentTime,
    duration,
    setIsPlaying,
    isValid
  } = useAudioElement(file, onTimeUpdate, onDurationChange, onError);
  
  // Handle audio settings like volume and playback rate
  const {
    volume,
    isMuted,
    playbackRate,
    handleToggleMute,
    handleVolumeChange,
    handlePlaybackRateChange
  } = useAudioSettings(audioElement, audioIdRef.current);
  
  // Handle playback controls
  const { 
    handlePlayPause,
    handleSeek,
    handleSkip,
    seekToTimestamp
  } = usePlaybackControls(audioElement, setIsPlaying, updateTime);
  
  // Handle visibility changes
  useVisibilityChange({
    onHidden: () => {
      if (audioElement && isPlaying) {
        // Save state when tab is hidden
        updateTime(audioElement.currentTime, audioElement.duration);
      }
    }
  });

  return {
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    playbackRate,
    isValid,
    handlePlayPause,
    handleSeek,
    handleSkip,
    handleToggleMute,
    handleVolumeChange,
    handlePlaybackRateChange,
    seekToTimestamp,
  };
}

export * from './types';
