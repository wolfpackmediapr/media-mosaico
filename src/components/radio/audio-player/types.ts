
import { UploadedFile } from "@/components/radio/types"; // Assuming UploadedFile is defined here or imported correctly

export interface UseAudioPlayerOptions {
  file?: UploadedFile; // Changed from File to UploadedFile
  onEnded?: () => void;
  onError?: (message: string) => void;
  preservePlaybackOnBlur?: boolean; // Added this option
  resumeOnFocus?: boolean; // Added this option
}

export interface AudioPlayerProps {
  file: UploadedFile; // Changed from File to UploadedFile
  onEnded?: () => void;
  onError?: (error: string) => void;
}

export interface PlaybackControls {
  handlePlayPause: () => void;
  handleSeek: (time: number) => void;
  handleSkip: (direction: 'forward' | 'backward', amount?: number) => void;
}

export interface VolumeControls {
  isMuted: boolean;
  volume: number | number[]; // Accept both number and number[]
  handleVolumeChange: (value: number | number[]) => void; // Keep accepting array for slider compatibility
  toggleMute: () => void;
}

export interface PlaybackState {
  isPlaying: boolean;
  progress: number;
  duration: number;
  isMuted: boolean;
}
