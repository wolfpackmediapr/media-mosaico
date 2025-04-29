
import React, { useEffect, useRef } from 'react';
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
  const playerRef = useRef<HTMLDivElement>(null);

  // Add user interaction listener to help unlock audio context
  useEffect(() => {
    const playerElement = playerRef.current;
    
    // Function to unlock audio on first user interaction
    const unlockAudio = () => {
      console.log('[MediaControls] User interacted with controls, attempting playback');
      // We don't actually need to do anything here - the interaction itself is what matters
      // The Howler engine will detect this interaction
    };
    
    if (playerElement && currentFile) {
      // Listen for any interaction with the player controls
      playerElement.addEventListener('click', unlockAudio, { once: true });
      playerElement.addEventListener('touchstart', unlockAudio, { once: true });
    }
    
    return () => {
      if (playerElement) {
        playerElement.removeEventListener('click', unlockAudio);
        playerElement.removeEventListener('touchstart', unlockAudio);
      }
    };
  }, [currentFile]);

  if (!currentFile) return null;

  // Using the Publimedia green color (#66cc00)
  const publimediaGreen = "#66cc00";

  return (
    <div ref={playerRef}>
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
    </div>
  );
};

export default MediaControls;
