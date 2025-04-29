
import React, { useEffect, useRef } from 'react';
import { AudioPlayerHeader } from './AudioPlayerHeader';
import { ProgressBar } from './ProgressBar';
import { AudioPlayerControls } from './AudioPlayerControls';
import { formatTime } from './utils/timeFormatter';
import { Card, CardContent } from "@/components/ui/card";
import { useAudioPlayer } from './hooks/useAudioPlayer';
import { AudioPlayerProps } from './types';

export const AudioPlayer = ({ file, onEnded }: AudioPlayerProps) => {
  const playerRef = useRef<HTMLDivElement>(null);

  const {
    isPlaying,
    currentTime,
    duration,
    isMuted,
    volume,
    playbackRate,
    handlePlayPause,
    handleSeek,
    handleSkip,
    handleToggleMute,
    handleVolumeChange,
    handlePlaybackRateChange
  } = useAudioPlayer({ file, onEnded });

  const handleSeekWithClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    handleSeek(percentage * duration);
  };

  // Add event listener to ensure user interaction is captured
  useEffect(() => {
    const playerElement = playerRef.current;
    
    if (playerElement) {
      // Function to handle any interaction with the player
      const handlePlayerInteraction = () => {
        // This creates an opportunity for the audio context to be unlocked
        console.log('[AudioPlayer] User interacted with player');
      };
      
      // Listen for various interaction events
      playerElement.addEventListener('mousedown', handlePlayerInteraction);
      playerElement.addEventListener('touchstart', handlePlayerInteraction);
      playerElement.addEventListener('click', handlePlayerInteraction);
      
      return () => {
        // Clean up event listeners
        playerElement.removeEventListener('mousedown', handlePlayerInteraction);
        playerElement.removeEventListener('touchstart', handlePlayerInteraction);
        playerElement.removeEventListener('click', handlePlayerInteraction);
      };
    }
  }, []);

  return (
    <Card className="w-full" ref={playerRef}>
      <CardContent className="p-4">
        <AudioPlayerHeader fileName={file.name} />
        
        <ProgressBar
          progress={currentTime}
          duration={duration}
          onSeek={handleSeekWithClick}
          formatTime={formatTime}
        />
        
        <AudioPlayerControls
          isPlaying={isPlaying}
          playbackControls={{
            handlePlayPause,
            handleSeek,
            handleSkip
          }}
          volumeControls={{
            isMuted,
            volume,
            handleVolumeChange,
            toggleMute: handleToggleMute
          }}
          playbackRate={playbackRate}
          onChangePlaybackRate={handlePlaybackRateChange}
        />
      </CardContent>
    </Card>
  );
};
