
import React, { useEffect, useRef } from 'react';
import { MusicCard } from "@/components/ui/music-card";
import { Howler } from 'howler'; // Add Howler import

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
  const interactionHandledRef = useRef<boolean>(false);

  // Add user interaction listener to help unlock audio context
  useEffect(() => {
    const playerElement = playerRef.current;
    
    // Function to unlock audio on first user interaction
    const unlockAudio = () => {
      if (interactionHandledRef.current) return;
      interactionHandledRef.current = true;
      
      console.log('[MediaControls] User interacted with controls, attempting to resume audio context');
      
      // Try to resume audio context if it exists and is suspended
      if (Howler && Howler.ctx && Howler.ctx.state === 'suspended') {
        console.log('[MediaControls] Found suspended Howler context, attempting to resume...');
        Howler.ctx.resume().then(() => {
          console.log('[MediaControls] Successfully resumed audio context via user interaction');
        }).catch(err => {
          console.error('[MediaControls] Error resuming audio context:', err);
        });
      }
    };
    
    if (playerElement && currentFile) {
      // Listen for any interaction with the player controls
      playerElement.addEventListener('click', unlockAudio);
      playerElement.addEventListener('touchstart', unlockAudio);
      playerElement.addEventListener('mousedown', unlockAudio);
    }
    
    return () => {
      if (playerElement) {
        playerElement.removeEventListener('click', unlockAudio);
        playerElement.removeEventListener('touchstart', unlockAudio);
        playerElement.removeEventListener('mousedown', unlockAudio);
      }
    };
  }, [currentFile]);

  // Add a component mount effect to check audio context state on initial render
  useEffect(() => {
    // Check audio context state on mount
    if (Howler && Howler.ctx) {
      console.log(`[MediaControls] Initial Howler context state: ${Howler.ctx.state}`);
      
      // If suspended, we'll try to resume when first interacted with
      if (Howler.ctx.state === 'suspended') {
        console.log('[MediaControls] Audio context suspended on mount, will resume on interaction');
      }
    }
  }, []);

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
