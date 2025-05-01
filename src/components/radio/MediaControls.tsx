
import { MusicCard } from "@/components/ui/music-card";

interface UploadedFile extends File {
  preview?: string;
}

interface MediaControlsProps {
  currentFile?: UploadedFile;
  metadata?: {
    emisora?: string;
    programa?: string;
    horario?: string;
    categoria?: string;
    station_id?: string;
    program_id?: string;
  };
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isMuted: boolean;
  volume: number[];  // Changed from number to number[]
  playbackRate: number;
  onPlayPause: () => void;
  onSeek: (seconds: number) => void;
  onSkip: (direction: 'forward' | 'backward', amount?: number) => void;
  onToggleMute: () => void;
  onVolumeChange: (value: number[]) => void;  // Changed from (value: number) => void to (value: number[]) => void
  onPlaybackRateChange: (newRate: number) => void; // Fix: Add parameter to match expected function signature
}

const MediaControls = ({
  currentFile,
  metadata,
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
  onPlaybackRateChange
}: MediaControlsProps) => {
  if (!currentFile) return null;

  // Using the Publimedia green color (#66cc00)
  const publimediaGreen = "#66cc00";

  return (
    <MusicCard
      file={currentFile}
      title={currentFile.name}
      artist={metadata?.emisora || 'Radio Transcription'}
      mainColor={publimediaGreen}
      customControls={true}
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
  );
};

export default MediaControls;
