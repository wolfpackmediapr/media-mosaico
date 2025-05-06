
import React from "react";
import { CompactMusicCard } from "./audio-player/CompactMusicCard";
import { ensureUiVolumeFormat } from "@/utils/audio-volume-adapter";

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
  // If not using custom controls, the component handles its own audio state
  if (!customControls) {
    return (
      <InternalAudioMusicCard 
        src={src}
        file={file}
        poster={poster}
        title={title}
        artist={artist}
        mainColor={mainColor}
      />
    );
  }
  
  // Safe volume conversion
  const safeVolume = ensureUiVolumeFormat(volume);
  
  // With custom controls, we're just a UI component rendering external state
  return (
    <CompactMusicCard 
      title={title}
      artist={artist}
      poster={poster}
      mainColor={mainColor}
      isPlaying={isPlaying}
      currentTime={currentTime}
      duration={duration}
      isMuted={isMuted}
      volume={safeVolume}
      playbackRate={playbackRate}
      onPlayPause={onPlayPause || (() => {})}
      onSeek={onSeek || (() => {})}
      onSkip={onSkip || (() => {})}
      onToggleMute={onToggleMute || (() => {})}
      onVolumeChange={onVolumeChange || (() => {})}
      onPlaybackRateChange={onPlaybackRateChange || (() => {})}
    />
  );
}

// Internal component that handles its own audio when not using custom controls
function InternalAudioMusicCard({ 
  src, 
  file, 
  poster, 
  title, 
  artist, 
  mainColor 
}: { 
  src?: string;
  file?: File;
  poster?: string;
  title?: string;
  artist?: string;
  mainColor: string;
}) {
  const [audio, setAudio] = React.useState<HTMLAudioElement | null>(null);
  const [localIsPlaying, setLocalIsPlaying] = React.useState(false);
  const [localCurrentTime, setLocalCurrentTime] = React.useState(0);
  const [localDuration, setLocalDuration] = React.useState(0);
  const [localIsMuted, setLocalIsMuted] = React.useState(false);
  const [localVolume, setLocalVolume] = React.useState([50]);
  const [localPlaybackRate, setLocalPlaybackRate] = React.useState(1);
  
  React.useEffect(() => {
    if (src || file) {
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
  }, [src, file]);
  
  const togglePlayPause = () => {
    if (audio) {
      if (localIsPlaying) {
        audio.pause();
      } else {
        audio.play().catch(err => {
          console.error("Error playing audio:", err);
        });
      }
      setLocalIsPlaying(!localIsPlaying);
    }
  };
  
  const handleSeek = (time: number) => {
    if (audio) {
      audio.currentTime = time;
      setLocalCurrentTime(time);
    }
  };
  
  const handleSkip = (direction: 'backward' | 'forward') => {
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
    if (audio) {
      audio.muted = !localIsMuted;
      setLocalIsMuted(!localIsMuted);
    }
  };
  
  const handleVolumeChange = (value: number[]) => {
    if (audio && value.length > 0) {
      const volumeValue = value[0] / 100;
      audio.volume = volumeValue;
      setLocalVolume(value);
      
      if (value[0] === 0) {
        setLocalIsMuted(true);
        audio.muted = true;
      } else if (localIsMuted) {
        setLocalIsMuted(false);
        audio.muted = false;
      }
    }
  };
  
  const handlePlaybackRateChange = () => {
    if (audio) {
      // Cycle through common playback rates
      const newRate = localPlaybackRate >= 2 ? 0.5 : localPlaybackRate + 0.5;
      audio.playbackRate = newRate;
      setLocalPlaybackRate(newRate);
    }
  };
  
  return (
    <CompactMusicCard 
      title={title}
      artist={artist}
      poster={poster}
      mainColor={mainColor}
      isPlaying={localIsPlaying}
      currentTime={localCurrentTime}
      duration={localDuration}
      isMuted={localIsMuted}
      volume={localVolume}
      playbackRate={localPlaybackRate}
      onPlayPause={togglePlayPause}
      onSeek={handleSeek}
      onSkip={handleSkip}
      onToggleMute={toggleMute}
      onVolumeChange={handleVolumeChange}
      onPlaybackRateChange={handlePlaybackRateChange}
    />
  );
}
