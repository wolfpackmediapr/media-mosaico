
import React from "react";
import MediaControls from "../MediaControls";
import TrackList from "../TrackList";

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
  volume: number[];  // Changed from number to number[]
  playbackRate: number;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onSkip: (direction: 'forward' | 'backward') => void;
  onToggleMute: () => void;
  onVolumeChange: (value: number[]) => void;  // Changed from (value: number) => void to (value: number[]) => void
  onPlaybackRateChange: () => void;
  handleTrackSelect: (index: number) => void;
}

const RightSection = ({
  currentFile,
  metadata,
  files,
  currentFileIndex,
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
  onPlaybackRateChange,
  handleTrackSelect
}: RightSectionProps) => (
  <div className="space-y-4">
    {currentFile && (
      <MediaControls
        currentFile={currentFile}
        metadata={metadata}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        isMuted={isMuted}
        volume={volume}
        playbackRate={playbackRate}
        onPlayPause={onPlayPause}
        onSeek={onSeek}
        onSkip={onSkip}
        onToggleMute={onToggleMute}
        onVolumeChange={onVolumeChange}
        onPlaybackRateChange={onPlaybackRateChange}
      />
    )}
    {files.length > 0 && (
      <TrackList
        files={files}
        currentFileIndex={currentFileIndex}
        onSelectTrack={handleTrackSelect}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
      />
    )}
  </div>
);

export default RightSection;
