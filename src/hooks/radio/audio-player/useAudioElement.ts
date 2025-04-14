
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useMediaStatePersistence } from "@/hooks/use-media-state-persistence";
import { v4 as uuidv4 } from "uuid";
import { useAudioSource } from "./useAudioSource";

export function useAudioElement(
  file?: File, 
  onTimeUpdate?: (time: number) => void,
  onDurationChange?: (duration: number) => void,
  onError?: (error: string) => void
) {
  // Generate a stable ID for this audio instance
  const audioIdRef = useRef<string>(file ? `audio-${file.name}-${uuidv4()}` : "audio-empty");
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  // Use our audio source hook to handle the file
  const { audioSource, isValid, url } = useAudioSource(file, { 
    onError: (error) => {
      toast.error(error);
      if (onError) onError(error);
    }
  });
  
  // Use our media state persistence
  const { 
    updateTime, 
    updatePlayingState, 
    setMediaElement,
    isActiveMedia
  } = useMediaStatePersistence(audioIdRef.current, {
    mediaType: "audio",
    fileName: file?.name,
    onTimeRestored: (time) => {
      if (audioElement) {
        audioElement.currentTime = time;
        setCurrentTime(time);
      }
    }
  });

  useEffect(() => {
    // If we don't have a valid audio source, return early
    if (!isValid || !url) {
      console.log("No valid audio source available");
      return;
    }

    try {
      const audio = new Audio();
      audio.src = url;
      audio.preload = "metadata";
      
      setMediaElement(audio);
      
      audio.onloadedmetadata = () => {
        setDuration(audio.duration);
        if (onDurationChange) {
          onDurationChange(audio.duration);
        }
      };
      
      audio.ontimeupdate = () => {
        setCurrentTime(audio.currentTime);
        updateTime(audio.currentTime, audio.duration);
        if (onTimeUpdate) {
          onTimeUpdate(audio.currentTime);
        }
      };
      
      audio.onended = () => {
        setIsPlaying(false);
        updatePlayingState(false);
      };
      
      audio.onplay = () => {
        setIsPlaying(true);
        updatePlayingState(true);
      };
      
      audio.onpause = () => {
        setIsPlaying(false);
        updatePlayingState(false);
      };
      
      // Add error handling for audio loading errors
      audio.onerror = (e) => {
        console.error("Audio loading error:", e);
        toast.error("Error loading audio file");
        if (onError) onError("Error loading audio file");
      };
      
      setAudioElement(audio);
      
      return () => {
        audio.pause();
        // No need to revoke object URL here as it's handled by useAudioSource
      };
    } catch (error) {
      console.error("Error creating audio element:", error);
      toast.error("Error loading audio file");
      if (onError) onError("Error creating audio element");
      return () => {};
    }
  }, [url, isValid, onTimeUpdate, onDurationChange, updateTime, updatePlayingState]);

  // Handle other players becoming active
  useEffect(() => {
    if (!isActiveMedia && isPlaying && audioElement) {
      audioElement.pause();
      setIsPlaying(false);
    }
  }, [isActiveMedia, isPlaying]);

  return {
    audioElement,
    isPlaying,
    currentTime,
    duration,
    setIsPlaying,
    isValid: isValid && !!audioElement
  };
}
