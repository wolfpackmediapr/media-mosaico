import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX 
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { ensureUiVolumeFormat, ensureAudioVolumeFormat } from "@/utils/audio-volume-adapter";

interface MusicCardProps {
  src?: string;
  poster?: string;
  title?: string;
  artist?: string;
  mainColor?: string;
  file?: File;
  onSeek?: (seconds: number) => void;
  onPlayPause?: () => void;
  onSkip?: (direction: 'backward' | 'forward', amount?: number) => void;
  customControls?: boolean;
  isPlaying?: boolean;
  currentTime?: number;
  duration?: number;
  isMuted?: boolean;
  onToggleMute?: () => void;
  onVolumeChange?: (value: number[]) => void;
  volume?: number[];
  playbackRate?: number;
  onPlaybackRateChange?: () => void;
}

export function MusicCard({
  src,
  poster,
  title,
  artist,
  mainColor = "#3B82F6", // Default to primary blue
  file,
  onSeek,
  onPlayPause,
  onSkip,
  customControls = false,
  isPlaying = false,
  currentTime = 0,
  duration = 0,
  isMuted = false,
  onToggleMute,
  onVolumeChange,
  volume = [50],
  playbackRate = 1,
  onPlaybackRateChange,
}: MusicCardProps) {
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [localIsPlaying, setLocalIsPlaying] = useState(false);
  const [localCurrentTime, setLocalCurrentTime] = useState(0);
  const [localDuration, setLocalDuration] = useState(0);
  const [localIsMuted, setLocalIsMuted] = useState(false);
  const [localVolume, setLocalVolume] = useState(50);
  
  useEffect(() => {
    if (!customControls && (src || file)) {
      const audioElement = new Audio();
      
      if (src) {
        audioElement.src = src;
      } else if (file) {
        audioElement.src = URL.createObjectURL(file);
      }
      
      audioElement.onloadedmetadata = () => {
        setLocalDuration(audioElement.duration);
      };
      
      audioElement.ontimeupdate = () => {
        setLocalCurrentTime(audioElement.currentTime);
      };
      
      audioElement.onended = () => {
        setLocalIsPlaying(false);
      };
      
      setAudio(audioElement);
      
      return () => {
        audioElement.pause();
        if (file) {
          URL.revokeObjectURL(audioElement.src);
        }
      };
    }
  }, [src, file, customControls]);
  
  const togglePlayPause = () => {
    if (customControls && onPlayPause) {
      onPlayPause();
      return;
    }
    
    if (audio) {
      if (localIsPlaying) {
        audio.pause();
      } else {
        audio.play();
      }
      setLocalIsPlaying(!localIsPlaying);
    }
  };
  
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    
    if (customControls && onSeek) {
      onSeek(percentage * (duration || 0));
      return;
    }
    
    if (audio) {
      const newTime = percentage * localDuration;
      audio.currentTime = newTime;
      setLocalCurrentTime(newTime);
    }
  };
  
  const handleSkip = (direction: 'backward' | 'forward') => {
    if (customControls && onSkip) {
      onSkip(direction);
      return;
    }
    
    if (audio) {
      const skipAmount = 10;
      if (direction === 'backward') {
        audio.currentTime = Math.max(0, audio.currentTime - skipAmount);
      } else {
        audio.currentTime = Math.min(localDuration, audio.currentTime + skipAmount);
      }
    }
  };
  
  const toggleMute = () => {
    if (customControls && onToggleMute) {
      onToggleMute();
      return;
    }
    
    if (audio) {
      audio.muted = !localIsMuted;
      setLocalIsMuted(!localIsMuted);
    }
  };
  
  const handleVolumeChange = (value: number[]) => {
    if (customControls && onVolumeChange) {
      // Ensure we're passing proper UI volume format (array)
      onVolumeChange(value);
      return;
    }
    
    if (audio) {
      try {
        // Convert UI volume (0-100 array) to audio volume (0-1)
        const volumeValue = value[0] / 100;
        audio.volume = volumeValue;
        setLocalVolume(value[0]);
        
        if (value[0] === 0) {
          setLocalIsMuted(true);
          audio.muted = true;
        } else if (localIsMuted) {
          setLocalIsMuted(false);
          audio.muted = false;
        }
      } catch (err) {
        console.warn('[MusicCard] Error setting volume:', err);
      }
    }
  };
  
  // Use either custom props or local state
  const displayIsPlaying = customControls ? isPlaying : localIsPlaying;
  const displayCurrentTime = customControls ? currentTime : localCurrentTime;
  const displayDuration = customControls ? duration : localDuration;
  const displayIsMuted = customControls ? isMuted : localIsMuted;
  
  // Ensure volume is always in the correct format
  const displayVolume = customControls ? 
    ensureUiVolumeFormat(volume) : 
    [localVolume];
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const progressPercentage = displayDuration > 0 ? (displayCurrentTime / displayDuration) * 100 : 0;
  
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
            <div className="flex items-center">
              {onPlaybackRateChange && (
                <button 
                  onClick={onPlaybackRateChange}
                  className="p-2 text-sm font-mono rounded-full hover:bg-muted"
                  title="Change playback speed"
                >
                  {playbackRate}x
                </button>
              )}
              <button
                onClick={toggleMute}
                className={cn(
                  "p-2 rounded-full hover:bg-muted",
                  displayIsMuted && "text-muted-foreground"
                )}
                title={displayIsMuted ? "Unmute" : "Mute"}
              >
                {displayIsMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            </div>
          </div>
          
          <div 
            className="h-1.5 w-full bg-muted rounded-full mb-2 cursor-pointer"
            onClick={handleSeek}
          >
            <div 
              className="h-full rounded-full" 
              style={{ 
                width: `${progressPercentage}%`,
                backgroundColor: mainColor 
              }}
            />
          </div>
          
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleSkip('backward')}
                className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                title="Rewind 10 seconds"
              >
                <SkipBack className="w-4 h-4" />
              </button>
              
              <button
                onClick={togglePlayPause}
                className="p-1 rounded-full hover:bg-muted transition-colors"
                style={{ color: mainColor }}
                title={displayIsPlaying ? "Pause" : "Play"}
              >
                {displayIsPlaying ? 
                  <Pause className="w-6 h-6" /> : 
                  <Play className="w-6 h-6" />
                }
              </button>
              
              <button
                onClick={() => handleSkip('forward')}
                className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                title="Forward 10 seconds"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{formatTime(displayCurrentTime)}</span>
              <span>/</span>
              <span>{formatTime(displayDuration)}</span>
            </div>
          </div>
          
          <div className="mt-3 flex items-center gap-2">
            <Volume2 className="w-3 h-3 text-muted-foreground" />
            <Slider
              className="w-24"
              value={displayVolume}
              max={100}
              step={1}
              onValueChange={handleVolumeChange}
              aria-label="Volume"
              style={{ 
                "--thumb-bg": mainColor,
                "--track-active-bg": mainColor
              } as React.CSSProperties}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
