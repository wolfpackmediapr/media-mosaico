import { Howl } from 'howler';

export interface AudioPlayerProps {
  file: File;
  onEnded?: () => void;
  onError?: (error: string) => void;
}

export interface PlaybackState {
  isPlaying: boolean;
  progress: number;
  duration: number;
  isMuted: boolean;
}

export interface PlaybackControls {
  handlePlayPause: () => void;
  handleSkip: (direction: 'forward' | 'backward', amount?: number) => void;
  handleSeek: (time: number) => void;
}

export interface VolumeControls {
  isMuted: boolean;
  volume: number[];
  handleVolumeChange: (value: number[]) => void;
  toggleMute: () => void;
}
