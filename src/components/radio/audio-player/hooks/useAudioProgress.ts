
import { useRef, useEffect } from 'react';
import { Howl } from 'howler';
import { usePersistentState } from '@/hooks/use-persistent-state';

interface UseAudioProgressProps {
  howler: React.MutableRefObject<Howl | null>;
  file: File;
  isPlaying: boolean;
}

export const useAudioProgress = ({ howler, file, isPlaying }: UseAudioProgressProps) => {
  const [progress, setProgress] = useState(0);
  const progressInterval = useRef<ReturnType<typeof setInterval>>();
  const [lastPosition, setLastPosition] = usePersistentState<Record<string, number>>(
    'audio-player-positions',
    {},
    { storage: 'sessionStorage' }
  );

  const updateProgress = () => {
    if (!howler.current) return;

    progressInterval.current = setInterval(() => {
      if (howler.current) {
        const seek = howler.current.seek() || 0;
        setProgress(seek);
        
        const fileId = file.name + '-' + file.size;
        setLastPosition({...lastPosition, [fileId]: seek});
      }
    }, 1000);
  };

  useEffect(() => {
    if (isPlaying) {
      updateProgress();
    } else if (progressInterval.current) {
      clearInterval(progressInterval.current);
    }

    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, [isPlaying, file]);

  return { progress, lastPosition };
};
