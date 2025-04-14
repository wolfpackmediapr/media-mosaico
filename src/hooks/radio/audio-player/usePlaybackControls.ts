
import { useCallback } from "react";
import { toast } from "sonner";

export function usePlaybackControls(
  audioElement: HTMLAudioElement | null,
  setIsPlaying: (isPlaying: boolean) => void,
  updateTime?: (time: number, duration: number) => void
) {
  const handlePlayPause = useCallback(() => {
    if (!audioElement) return;
    
    if (audioElement.paused) {
      audioElement.play();
    } else {
      audioElement.pause();
    }
  }, [audioElement]);

  const handleSeek = useCallback((seconds: number) => {
    if (!audioElement) return;
    audioElement.currentTime = seconds;
    if (updateTime) {
      updateTime(seconds, audioElement.duration);
    }
  }, [audioElement, updateTime]);

  const handleSkip = useCallback((direction: 'forward' | 'backward', amount: number = 10) => {
    if (!audioElement) return;
    
    const newTime = direction === 'forward' 
      ? Math.min(audioElement.duration, audioElement.currentTime + amount)
      : Math.max(0, audioElement.currentTime - amount);
      
    audioElement.currentTime = newTime;
    if (updateTime) {
      updateTime(newTime, audioElement.duration);
    }
  }, [audioElement, updateTime]);

  // Update the seekToTimestamp function to properly handle both milliseconds and seconds
  const seekToTimestamp = useCallback((timestamp: number) => {
    if (!audioElement) {
      console.warn('No audio element found to seek');
      return;
    }
    
    // Check if the timestamp is in milliseconds (large number) and convert to seconds if needed
    const targetSeconds = timestamp > 1000 ? timestamp / 1000 : timestamp;
    
    console.log(`Seeking to timestamp: ${timestamp}, converted to seconds: ${targetSeconds}`);
    
    audioElement.currentTime = targetSeconds;
    audioElement.play().catch(error => {
      console.error("Error playing audio when seeking to timestamp:", error);
      toast.error("Error reproduciendo el audio");
    });
    setIsPlaying(true);
  }, [audioElement, setIsPlaying]);

  return {
    handlePlayPause,
    handleSeek,
    handleSkip,
    seekToTimestamp
  };
}
