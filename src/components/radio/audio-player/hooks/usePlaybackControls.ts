
import { useState } from 'react';
import { Howl } from 'howler';
import { toast } from 'sonner';

interface UsePlaybackControlsProps {
  howler: React.MutableRefObject<Howl | null>;
  duration: number;
}

export const usePlaybackControls = ({ howler, duration }: UsePlaybackControlsProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);

  const handlePlayPause = () => {
    if (!howler.current) return;

    if (isPlaying) {
      howler.current.pause();
    } else {
      howler.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (time: number) => {
    if (!howler.current) return;
    howler.current.seek(time);
  };

  const handleSkip = (direction: 'forward' | 'backward', amount: number = 10) => {
    if (!howler.current) return;

    const currentTime = howler.current.seek() as number;
    const newTime = direction === 'forward'
      ? Math.min(currentTime + amount, duration)
      : Math.max(currentTime - amount, 0);

    howler.current.seek(newTime);
  };

  const changePlaybackRate = (rate: number) => {
    if (!howler.current) return;
    
    howler.current.rate(rate);
    setPlaybackRate(rate);
    toast.info(`Velocidad: ${rate}x`);
  };

  return {
    isPlaying,
    playbackRate,
    handlePlayPause,
    handleSeek,
    handleSkip,
    changePlaybackRate,
    setIsPlaying,
  };
};
