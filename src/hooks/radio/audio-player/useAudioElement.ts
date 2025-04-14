
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useMediaStatePersistence } from "@/hooks/use-media-state-persistence";
import { v4 as uuidv4 } from "uuid";

export function useAudioElement(
  file?: File, 
  onTimeUpdate?: (time: number) => void,
  onDurationChange?: (duration: number) => void
) {
  // Generate a stable ID for this audio instance
  const audioIdRef = useRef<string>(file ? `audio-${file.name}-${uuidv4()}` : "audio-empty");
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
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
    // If no file provided or the file is invalid, return early
    if (!file || !(file instanceof File)) {
      console.log("No valid file provided to audio player");
      return;
    }

    let objectUrl: string | null = null;
    
    // Create a blob URL from the file
    try {
      // Validate the file before creating the URL
      if (file.size === 0) {
        throw new Error("File is empty");
      }
      
      // Create the object URL with proper error handling
      objectUrl = URL.createObjectURL(file);
      if (!objectUrl) {
        throw new Error("Failed to create object URL");
      }
      
      const audio = new Audio();
      audio.src = objectUrl;
      
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
        
        // Clean up the object URL on error
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
        }
      };
      
      setAudioElement(audio);
      
      return () => {
        audio.pause();
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
        }
      };
    } catch (error) {
      console.error("Error creating audio element:", error);
      toast.error("Error loading audio file");
      
      // Clean up the object URL if it was created
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
      return () => {};
    }
  }, [file, onTimeUpdate, onDurationChange, updateTime, updatePlayingState]);

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
    setIsPlaying
  };
}
