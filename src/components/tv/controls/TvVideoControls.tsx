
import React from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";

interface TvVideoControlsProps {
  isPlaying: boolean;
  volume: number[];
  onTogglePlayback: () => void;
  onVolumeChange: (value: number[]) => void;
  currentTime?: number;
  duration?: number;
  onSeek?: (time: number) => void;
}

const TvVideoControls = ({
  isPlaying,
  volume,
  onTogglePlayback,
  onVolumeChange,
  currentTime = 0,
  duration = 0,
  onSeek
}: TvVideoControlsProps) => {
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleSeek = (value: number[]) => {
    if (onSeek && duration > 0) {
      const seekTime = (value[0] / 100) * duration;
      onSeek(seekTime);
    }
  };

  const isMuted = volume[0] === 0;

  return (
    <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
      {/* Play/Pause Button */}
      <Button
        variant="outline"
        size="icon"
        onClick={onTogglePlayback}
        className="shrink-0"
      >
        {isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
      </Button>

      {/* Progress Bar */}
      {duration > 0 && (
        <div className="flex-1 flex items-center gap-2">
          <span className="text-sm text-gray-500 min-w-[40px]">
            {formatTime(currentTime)}
          </span>
          <Slider
            value={[duration > 0 ? (currentTime / duration) * 100 : 0]}
            onValueChange={handleSeek}
            max={100}
            step={0.1}
            className="flex-1"
          />
          <span className="text-sm text-gray-500 min-w-[40px]">
            {formatTime(duration)}
          </span>
        </div>
      )}

      {/* Volume Control */}
      <div className="flex items-center gap-2 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onVolumeChange(isMuted ? [50] : [0])}
        >
          {isMuted ? (
            <VolumeX className="h-4 w-4" />
          ) : (
            <Volume2 className="h-4 w-4" />
          )}
        </Button>
        <div className="w-20">
          <Slider
            value={volume}
            onValueChange={onVolumeChange}
            max={100}
            step={1}
          />
        </div>
      </div>
    </div>
  );
};

export default TvVideoControls;
