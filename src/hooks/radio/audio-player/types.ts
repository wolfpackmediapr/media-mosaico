
export interface AudioPlayerOptions {
  file?: File;
  onTimeUpdate?: (time: number) => void;
  onDurationChange?: (duration: number) => void;
  onError?: (error: string) => void;
  onPlaybackEnd?: () => void;
}

export interface AudioPlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number[];
  isMuted: boolean;
  playbackRate: number;
  isValid: boolean;
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

export interface AudioPlayerProps {
  file: File;
  onEnded?: () => void;
  onError?: (error: string) => void;
}

export interface AudioPlayerHookReturn {
  howler: React.MutableRefObject<any>;
  playbackState: {
    isPlaying: boolean;
    progress: number;
    duration: number;
    isMuted: boolean;
  };
  playbackRate: number;
  setPlaybackRate: (rate: number) => void;
  volumeControls: {
    isMuted: boolean;
    volume: number[];
    handleVolumeChange: (value: number[]) => void;
    toggleMute: () => void;
  };
  playbackControls: {
    handlePlayPause: () => void;
    handleSkip: (direction: 'forward' | 'backward', amount?: number) => void;
    handleSeek: (e: React.MouseEvent<HTMLDivElement>) => void;
  };
  formatTime: (seconds: number) => string;
  changePlaybackRate: () => void;
}
