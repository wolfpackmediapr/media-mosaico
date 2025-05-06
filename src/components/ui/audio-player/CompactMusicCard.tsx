
import React from "react";
import { PlayerControls } from "./PlayerControls";
import { ProgressBar } from "./ProgressBar";
import { ProgressDisplay } from "./ProgressDisplay";
import { VolumeSlider } from "./VolumeSlider";
import { PlaybackRateButton } from "./PlaybackRateButton";
import { ensureUiVolumeFormat } from "@/utils/audio-volume-adapter";
import { PlayDirection } from "@/types/player";

interface CompactMusicCardProps {
  title?: string;
  artist?: string;
  poster?: string;
  mainColor?: string;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isMuted: boolean;
  volume: number | number[];
  playbackRate: number;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onSkip: (direction: PlayDirection, amount?: number) => void;
  onToggleMute: () => void;
  onVolumeChange: (value: number[]) => void;
  onPlaybackRateChange: () => void;
}

export function CompactMusicCard({
  title,
  artist,
  poster,
  mainColor = "#3B82F6",
  isPlaying,
  currentTime,
  duration,
  isMuted,
  volume,
  playbackRate,
  onPlayPause,
  onSeek,
  onSkip,
  onToggleMute,
  onVolumeChange,
  onPlaybackRateChange
}: CompactMusicCardProps) {
  // Create a lighter version of the color for the gradient
  const lightenColor = (color: string, percent: number) => {
    // Convert hex to RGB
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    // Calculate lighter values
    const factor = percent / 100;
    const lighter = (value: number) => Math.round(value + (255 - value) * factor);
    
    // Convert back to hex
    return `#${lighter(r).toString(16).padStart(2, '0')}${lighter(g).toString(16).padStart(2, '0')}${lighter(b).toString(16).padStart(2, '0')}`;
  };

  // Create a lighter version of the main color for gradient
  const lighterColor = lightenColor(mainColor, 70);
  
  // Ensure volume is consistently in UI format
  const safeVolume = ensureUiVolumeFormat(volume);
  
  return (
    <div 
      className="rounded-xl p-4 w-full overflow-hidden"
      style={{
        background: `linear-gradient(to bottom right, ${mainColor}30, ${lighterColor}20)`,
        borderColor: `${mainColor}50`,
        borderWidth: "1px"
      }}
    >
      <div className="flex flex-col sm:flex-row gap-4 items-center">
        {poster && (
          <div 
            className="w-20 h-20 rounded-md overflow-hidden flex-shrink-0 shadow-md"
            style={{ borderColor: `${mainColor}50`, borderWidth: "1px" }}
          >
            <img 
              src={poster} 
              alt={title || "Album art"} 
              className="w-full h-full object-cover"
            />
          </div>
        )}
        
        <div className="flex-1 w-full">
          <div className="flex justify-between items-center mb-2">
            <div>
              {title && <h3 className="font-medium leading-none text-lg">{title}</h3>}
              {artist && <p className="text-sm text-muted-foreground mt-1">{artist}</p>}
            </div>
            <div className="flex items-center space-x-1">
              <PlaybackRateButton 
                playbackRate={playbackRate}
                onChange={onPlaybackRateChange}
              />
              <VolumeSlider
                volume={safeVolume}
                isMuted={isMuted}
                onVolumeChange={onVolumeChange}
                onToggleMute={onToggleMute}
              />
            </div>
          </div>
          
          <ProgressBar
            progress={currentTime}
            duration={duration}
            onSeek={onSeek}
            color={mainColor}
          />
          
          <div className="flex justify-between items-center">
            <PlayerControls
              isPlaying={isPlaying}
              onPlayPause={onPlayPause}
              onSkip={onSkip}
              size="sm"
            />
            <ProgressDisplay 
              currentTime={currentTime} 
              duration={duration} 
            />
          </div>
        </div>
      </div>
    </div>
  );
}
