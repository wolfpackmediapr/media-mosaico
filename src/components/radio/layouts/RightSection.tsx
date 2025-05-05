
import React from "react";
import { RightSection as RightSectionComponent } from "../containers/RightSection";

interface RightSectionProps {
  currentFile: File | null;
  metadata: {
    emisora?: string;
    programa?: string;
    horario?: string;
    categoria?: string;
    station_id?: string;
    program_id?: string;
  };
  files: File[];
  currentFileIndex: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isMuted: boolean;
  volume: number[];
  playbackRate: number;
  playbackErrors?: string | null;
  isFileValid?: boolean;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onSkip: (direction: 'forward' | 'backward') => void;
  onToggleMute: () => void;
  onVolumeChange: (value: number[]) => void;
  onPlaybackRateChange: () => void;
  handleTrackSelect: (index: number) => void;
  onSwitchToNative?: () => void;
}

const RightSection: React.FC<RightSectionProps> = (props) => {
  return <RightSectionComponent {...props} />;
};

export default RightSection;
