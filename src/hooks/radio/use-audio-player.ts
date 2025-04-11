
import { useState, useEffect } from "react";
import { toast } from "sonner";

interface AudioPlayerOptions {
  file?: File;
  onTimeUpdate?: (time: number) => void;
  onDurationChange?: (duration: number) => void;
}

export const useAudioPlayer = ({ file, onTimeUpdate, onDurationChange }: AudioPlayerOptions = {}) => {
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState<number[]>([50]);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);

  useEffect(() => {
    if (!file) return;

    const audio = new Audio(URL.createObjectURL(file));
    
    audio.onloadedmetadata = () => {
      setDuration(audio.duration);
      if (onDurationChange) {
        onDurationChange(audio.duration);
      }
    };
    
    audio.ontimeupdate = () => {
      setCurrentTime(audio.currentTime);
      if (onTimeUpdate) {
        onTimeUpdate(audio.currentTime);
      }
    };
    
    audio.onended = () => {
      setIsPlaying(false);
    };
    
    audio.volume = volume[0] / 100;
    audio.muted = isMuted;
    audio.playbackRate = playbackRate;
    
    setAudioElement(audio);
    
    return () => {
      audio.pause();
      URL.revokeObjectURL(audio.src);
    };
  }, [file, onTimeUpdate, onDurationChange]);

  const handlePlayPause = () => {
    if (!audioElement) return;
    
    if (isPlaying) {
      audioElement.pause();
    } else {
      audioElement.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (seconds: number) => {
    if (!audioElement) return;
    audioElement.currentTime = seconds;
    setCurrentTime(seconds);
  };

  const handleSkip = (direction: 'forward' | 'backward', amount: number = 10) => {
    if (!audioElement) return;
    
    const newTime = direction === 'forward' 
      ? Math.min(audioElement.duration, audioElement.currentTime + amount)
      : Math.max(0, audioElement.currentTime - amount);
      
    audioElement.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleToggleMute = () => {
    if (!audioElement) return;
    
    audioElement.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (newVolume: number[]) => {
    if (!audioElement) return;
    
    audioElement.volume = newVolume[0] / 100;
    setVolume(newVolume);
    
    if (newVolume[0] === 0) {
      setIsMuted(true);
      audioElement.muted = true;
    } else if (isMuted) {
      setIsMuted(false);
      audioElement.muted = false;
    }
  };

  const handlePlaybackRateChange = () => {
    if (!audioElement) return;
    
    const rates = [0.5, 1.0, 1.5, 2.0];
    const currentIndex = rates.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % rates.length;
    const newRate = rates[nextIndex];
    
    audioElement.playbackRate = newRate;
    setPlaybackRate(newRate);
    toast.info(`Velocidad: ${newRate}x`);
  };

  // Update the seekToTimestamp function to properly handle both milliseconds and seconds
  const seekToTimestamp = (timestamp: number) => {
    if (audioElement) {
      // Check if the timestamp is in milliseconds (large number) and convert to seconds if needed
      const targetSeconds = timestamp > 1000 ? timestamp / 1000 : timestamp;
      
      console.log(`Seeking to timestamp: ${timestamp}, converted to seconds: ${targetSeconds}`);
      
      audioElement.currentTime = targetSeconds;
      audioElement.play();
      setIsPlaying(true);
    } else {
      console.warn('No audio element found to seek');
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
    seekToTimestamp,
  };
};
