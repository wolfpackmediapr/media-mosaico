
import React from 'react';
import { AudioPlayerHeader } from './AudioPlayerHeader';
import { ProgressBar } from './ProgressBar';
import { AudioPlayerControls } from './AudioPlayerControls';
import { formatTime } from './utils/timeFormatter';
import { Card, CardContent } from "@/components/ui/card";
import { useAudioPlayer } from './hooks/useAudioPlayer';
import { AudioPlayerProps } from './types';

export const AudioPlayer = ({ file, onEnded }: AudioPlayerProps) => {
  const {
    playbackState: { isPlaying, progress, duration, isMuted },
    playbackRate,
    volumeControls,
    playbackControls,
    changePlaybackRate
  } = useAudioPlayer({ file, onEnded });

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    playbackControls.handleSeek(percentage * duration);
  };

  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <AudioPlayerHeader fileName={file.name} />
        
        <ProgressBar
          progress={progress}
          duration={duration}
          onSeek={handleSeek}
          formatTime={formatTime}
        />
        
        <AudioPlayerControls
          isPlaying={isPlaying}
          playbackControls={playbackControls}
          volumeControls={volumeControls}
          playbackRate={playbackRate}
          onChangePlaybackRate={changePlaybackRate}
        />
      </CardContent>
    </Card>
  );
};
