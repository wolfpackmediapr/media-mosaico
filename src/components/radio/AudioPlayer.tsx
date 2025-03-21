import { useState, useEffect, useRef } from 'react';
import { Howl } from 'howler';
import { CirclePlay, CirclePause, SkipForward, SkipBack } from 'lucide-react';
import { useMediaSession } from '@/hooks/use-media-session';
import { usePersistentState } from '@/hooks/use-persistent-state';

interface AudioPlayerProps {
  file: File;
  onEnded?: () => void;
}

export function AudioPlayer({ file, onEnded }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const [volume, setVolume] = usePersistentState<number[]>(
    'audio-player-volume', 
    [50], 
    { storage: 'localStorage' }
  );
  
  const [isMuted, setIsMuted] = useState(false);
  const howler = useRef<Howl | null>(null);
  const progressInterval = useRef<ReturnType<typeof setInterval>>();
  
  const [lastPosition, setLastPosition] = usePersistentState<Record<string, number>>(
    'audio-player-positions',
    {},
    { storage: 'sessionStorage' }
  );

  useEffect(() => {
    if (howler.current) {
      howler.current.unload();
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    }

    const fileUrl = URL.createObjectURL(file);
    const sound = new Howl({
      src: [fileUrl],
      format: ['mp3', 'wav', 'ogg', 'm4a'],
      onload: () => {
        setDuration(sound.duration());
        
        const fileId = file.name + '-' + file.size;
        if (lastPosition[fileId]) {
          sound.seek(lastPosition[fileId]);
          setProgress(lastPosition[fileId]);
        }
      },
      onplay: () => {
        setIsPlaying(true);
        updateProgress();
      },
      onpause: () => {
        setIsPlaying(false);
        if (progressInterval.current) {
          clearInterval(progressInterval.current);
        }
      },
      onend: () => {
        setIsPlaying(false);
        setProgress(0);
        if (progressInterval.current) {
          clearInterval(progressInterval.current);
        }
        if (onEnded) onEnded();
      },
      onstop: () => {
        setIsPlaying(false);
        setProgress(0);
        if (progressInterval.current) {
          clearInterval(progressInterval.current);
        }
      },
    });

    sound.volume(volume[0] / 100);

    howler.current = sound;

    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
      const fileId = file.name + '-' + file.size;
      if (sound) {
        const currentPos = sound.seek() as number;
        if (currentPos > 0) {
          setLastPosition({...lastPosition, [fileId]: currentPos});
        }
      }
      URL.revokeObjectURL(fileUrl);
      sound.unload();
    };
  }, [file, onEnded]);

  useMediaSession({
    title: file.name,
    artist: 'Transcripción de Audio',
    onPlay: () => {
      if (!isPlaying && howler.current) {
        howler.current.play();
      }
    },
    onPause: () => {
      if (isPlaying && howler.current) {
        howler.current.pause();
      }
    },
    onSeekBackward: (details) => {
      const seekAmount = details.seekOffset || 10;
      handleSkip('backward', seekAmount);
    },
    onSeekForward: (details) => {
      const seekAmount = details.seekOffset || 10;
      handleSkip('forward', seekAmount);
    }
  });

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

  const handlePlayPause = () => {
    if (!howler.current) return;

    if (isPlaying) {
      howler.current.pause();
    } else {
      howler.current.play();
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!howler.current) return;

    const container = e.currentTarget;
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newPosition = percentage * duration;

    howler.current.seek(newPosition);
    setProgress(newPosition);
  };

  const handleSkip = (direction: 'forward' | 'backward', amount: number = 10) => {
    if (!howler.current) return;

    const currentTime = howler.current.seek() as number;
    const newTime = direction === 'forward'
      ? Math.min(currentTime + amount, duration)
      : Math.max(currentTime - amount, 0);

    howler.current.seek(newTime);
    setProgress(newTime);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full bg-white/10 dark:bg-black/20 backdrop-blur-md rounded-xl p-4 shadow-xl transition-all duration-300">
      <div className="mb-4 px-2">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 truncate">
          {file.name}
        </h3>
      </div>

      <div className="mb-4 px-2">
        <div
          className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full cursor-pointer group"
          onClick={handleSeek}
        >
          <div
            className="h-full bg-primary rounded-full relative"
            style={{ width: `${(progress / duration) * 100}%` }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 
              bg-primary rounded-full shadow-md transform scale-0 
              group-hover:scale-100 transition-transform"
            />
          </div>
        </div>
        <div className="flex justify-between mt-1 text-xs text-gray-500 dark:text-gray-400">
          <span>{formatTime(progress)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      <div className="flex items-center justify-between px-4">
        <button
          onClick={() => handleSkip('backward')}
          className="p-2 text-gray-600 dark:text-gray-400 
            hover:text-primary dark:hover:text-primary 
            transition-colors"
          title="Retroceder 10 segundos"
        >
          <SkipBack className="w-6 h-6" />
        </button>
        <button
          onClick={handlePlayPause}
          className="p-2 text-primary hover:opacity-80 transition-colors"
        >
          {isPlaying ?
            <CirclePause className="w-8 h-8" /> :
            <CirclePlay className="w-8 h-8" />
          }
        </button>
        <button
          onClick={() => handleSkip('forward')}
          className="p-2 text-gray-600 dark:text-gray-400 
            hover:text-primary dark:hover:text-primary 
            transition-colors"
          title="Adelantar 10 segundos"
        >
          <SkipForward className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
