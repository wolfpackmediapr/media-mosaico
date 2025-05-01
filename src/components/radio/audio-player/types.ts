
import { VolumeValue } from '@/types/player';

export interface PlaybackControls {
  handlePlayPause: () => void;
  handleSeek: (time: number) => void;
  handleSkip: (direction: 'forward' | 'backward', amount?: number) => void;
}

export interface VolumeControls {
  isMuted: boolean;
  volume: number[];
  handleVolumeChange: (value: number[]) => void;
  toggleMute: () => void;
}

export interface AudioPlayerProps {
  file: File;
  onEnded?: () => void;
}

export interface AudioPlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number[];
  isMuted: boolean;
  playbackRate: number;
}
