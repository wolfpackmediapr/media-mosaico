
// Consistent types for audio player components
export type PlayDirection = 'forward' | 'backward';

export interface AudioFile extends File {
  preview?: string;
  id?: string;
}

// Volume can either be a single number (0-1) or an array [0-100] depending on the component
export type VolumeValue = number | number[];

export interface AudioPlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isMuted: boolean;
  volume: VolumeValue;
  playbackRate: number;
}

export interface AudioControls {
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onSkip: (direction: PlayDirection, amount?: number) => void;
  onToggleMute: () => void;
  onVolumeChange: (value: VolumeValue) => void;
  onPlaybackRateChange: (newRate: number) => void;
}

export interface AudioMetadataDisplay {
  emisora?: string;
  programa?: string;
  horario?: string;
  categoria?: string;
  station_id?: string;
  program_id?: string;
}
