
import { useState, useEffect, useRef } from 'react';
import { Howl } from 'howler';
import { CirclePlay, CirclePause, SkipForward, SkipBack } from 'lucide-react';

interface AudioPlayerProps {
  file: File;
  onEnded?: () => void;
}

export function AudioPlayer({ file, onEnded }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const howler = useRef<Howl | null>(null);
  const progressInterval = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (howler.current) {
      howler.current.stop();
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    }

    const fileUrl = URL.createObjectURL(file);
    const sound = new Howl({
      src: [fileUrl],
      format: ['mp3', 'wav'],
      onpause: () => {
        setIsPlaying(false);
        if (progressInterval.current) {
          clearInterval(progressInterval.current);
        }
      },
      onplay: () => {
        setIsPlaying(true);
        updateProgress();
      },
      onend: () => {
        setIsPlaying(false);
        if (progressInterval.current) {
          clearInterval(progressInterval.current);
        }
        setProgress(0);
        if (onEnded) onEnded();
      },
      onstop: () => {
        setIsPlaying(false);
        if (progressInterval.current) {
          clearInterval(progressInterval.current);
        }
        setProgress(0);
      },
      onload: () => {
        setDuration(sound.duration());
      }
    });

    howler.current = sound;

    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
      URL.revokeObjectURL(fileUrl);
      sound.unload();
    };
  }, [file]);

  const updateProgress = () => {
    if (!howler.current) return;

    progressInterval.current = setInterval(() => {
      const seek = howler.current?.seek() || 0;
      setProgress(seek);
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

  const handleSkip = (direction: 'forward' | 'backward') => {
    if (!howler.current) return;

    const currentTime = howler.current.seek() as number;
    const skipAmount = 10;
    const newTime = direction === 'forward'
      ? Math.min(currentTime + skipAmount, duration)
      : Math.max(currentTime - skipAmount, 0);

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
      {/* Audio info */}
      <div className="mb-4 px-2">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 truncate">
          {file.name}
        </h3>
      </div>

      {/* Progress bar */}
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

      {/* Control buttons */}
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
