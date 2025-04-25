
import React from 'react';
import { useAudioPlayer } from './useAudioPlayer';
import { AudioPlayerHeader } from './AudioPlayerHeader';
import { ProgressBar } from './ProgressBar';
import { AudioPlayerControls } from './AudioPlayerControls';
import { KeyboardShortcuts } from './KeyboardShortcuts';
import { AudioPlayerProps } from './types';
import { formatTime } from './utils/timeFormatter';

export function AudioPlayer({ file, onEnded, onError }: AudioPlayerProps) {
  const {
    playbackState,
    playbackRate,
    volumeControls,
    playbackControls,
    changePlaybackRate
  } = useAudioPlayer({
    file,
    onEnded,
    onError
  });

  const { isPlaying, progress, duration } = playbackState;
  
  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const progressBar = e.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    const clickPosition = (e.clientX - rect.left) / progressBar.clientWidth;
    const seekTime = duration * clickPosition;
    playbackControls.handleSeek(seekTime);
  };

  return (
    <div className="w-full bg-white/10 dark:bg-black/20 backdrop-blur-md rounded-xl p-4 shadow-xl transition-all duration-300">
      <AudioPlayerHeader fileName={file.name} />

      <ProgressBar 
        progress={progress} 
        duration={duration} 
        onSeek={handleProgressBarClick} 
        formatTime={formatTime} 
      />

      <AudioPlayerControls 
        isPlaying={isPlaying}
        playbackControls={playbackControls}
        volumeControls={volumeControls}
        playbackRate={playbackRate}
        onChangePlaybackRate={changePlaybackRate}
      />
      
      <KeyboardShortcuts />
    </div>
  );
}
