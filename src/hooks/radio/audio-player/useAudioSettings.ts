
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useMediaStatePersistence } from "@/hooks/use-media-state-persistence";

export function useAudioSettings(
  audioElement: HTMLAudioElement | null,
  audioId: string
) {
  const [volume, setVolume] = useState<number[]>([50]);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  
  // Use our media state persistence for settings
  const { 
    updateVolume, 
    updatePlaybackRate
  } = useMediaStatePersistence(audioId, {
    mediaType: "audio",
    initialVolume: volume[0],
    initialPlaybackRate: playbackRate
  });

  // Update volume in player when it changes in context
  useEffect(() => {
    if (audioElement) {
      audioElement.volume = volume[0] / 100;
      updateVolume(volume[0]);
    }
  }, [volume, updateVolume, audioElement]);

  // Update playback rate when it changes
  useEffect(() => {
    if (audioElement) {
      audioElement.playbackRate = playbackRate;
      updatePlaybackRate(playbackRate);
    }
  }, [playbackRate, updatePlaybackRate, audioElement]);

  const handleToggleMute = () => {
    if (!audioElement) return;
    
    const newMutedState = !isMuted;
    audioElement.muted = newMutedState;
    setIsMuted(newMutedState);
  };

  const handleVolumeChange = (newVolume: number[]) => {
    if (!audioElement) return;
    
    audioElement.volume = newVolume[0] / 100;
    setVolume(newVolume);
    updateVolume(newVolume[0]);
    
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
    updatePlaybackRate(newRate);
    toast.info(`Velocidad: ${newRate}x`);
  };

  return {
    volume,
    isMuted,
    playbackRate,
    handleToggleMute,
    handleVolumeChange,
    handlePlaybackRateChange
  };
}
