
import { MusicCard } from "@/components/ui/music-card";
import { EnhancedAudioPlayer } from "@/components/radio/audio-player/EnhancedAudioPlayer";
import { useState } from "react";

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
  volume: number[];
  playbackRate: number;
  onPlayPause: () => void;
  onSeek: (seconds: number) => void;
  onSkip: (direction: 'forward' | 'backward', amount?: number) => void;
  onToggleMute: () => void;
  onVolumeChange: (value: number[]) => void;
  onPlaybackRateChange: () => void;
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
  const [useLegacyPlayer, setUseLegacyPlayer] = useState(true);
  
  if (!currentFile) return null;

  // Using the Publimedia green color (#66cc00)
  const publimediaGreen = "#66cc00";

  // We're providing both the enhanced player and the legacy player with a toggle
  // This ensures backward compatibility while allowing users to try the new player
  return useLegacyPlayer ? (
    <>
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
      <div className="mt-2 text-center">
        <button 
          className="text-xs text-primary hover:underline" 
          onClick={() => setUseLegacyPlayer(false)}
        >
          Probar reproductor mejorado con persistencia
        </button>
      </div>
    </>
  ) : (
    <>
      {currentFile && (
        <EnhancedAudioPlayer
          file={currentFile}
          onError={(error) => console.error("Audio error:", error)}
        />
      )}
      <div className="mt-2 text-center">
        <button 
          className="text-xs text-primary hover:underline" 
          onClick={() => setUseLegacyPlayer(true)}
        >
          Volver al reproductor clásico
        </button>
      </div>
    </>
  );
};

export default MediaControls;
