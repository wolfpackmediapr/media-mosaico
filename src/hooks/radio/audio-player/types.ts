
export interface AudioPlayerOptions {
  file?: File;
  onTimeUpdate?: (time: number) => void;
  onDurationChange?: (duration: number) => void;
  onError?: (error: string) => void;
}

export interface AudioPlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number[];
  isMuted: boolean;
  playbackRate: number;
}

export interface AudioPlayerControls {
  handlePlayPause: () => void;
  handleSeek: (seconds: number) => void;
  handleSkip: (direction: 'forward' | 'backward', amount?: number) => void;
  handleToggleMute: () => void;
  handleVolumeChange: (newVolume: number[]) => void;
  handlePlaybackRateChange: () => void;
  seekToTimestamp: (timestamp: number) => void;
}
