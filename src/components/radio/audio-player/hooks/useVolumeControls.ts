
import { useState } from 'react';
import { usePersistentState } from '@/hooks/use-persistent-state';

export const useVolumeControls = () => {
  const [volume, setVolume] = usePersistentState<number[]>(
    'audio-player-volume', 
    [50], 
    { storage: 'localStorage' }
  );
  const [isMuted, setIsMuted] = useState(false);

  const handleVolumeChange = (value: number[]) => {
    setVolume(value);
    if (value[0] === 0) {
      setIsMuted(true);
    } else if (isMuted) {
      setIsMuted(false);
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  return {
    volume,
    isMuted,
    handleVolumeChange,
    toggleMute
  };
};
