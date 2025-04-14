
import React from 'react';
import { useAudioPlayer } from './useAudioPlayer';
import { AudioPlayerHeader } from './AudioPlayerHeader';
import { ProgressBar } from './ProgressBar';
import { AudioPlayerControls } from './AudioPlayerControls';
import { KeyboardShortcuts } from './KeyboardShortcuts';
import { useMediaStatePersistence } from '@/hooks/use-media-state-persistence';
import { useVisibilityChange } from '@/hooks/use-visibility-change';
import { v4 as uuidv4 } from 'uuid';
import { AudioPlayerProps } from './types';

export function EnhancedAudioPlayer({ file, onEnded, onError }: AudioPlayerProps) {
  const audioIdRef = React.useRef(`audio-${file.name}-${uuidv4()}`);
  
  const {
    playbackState,
    playbackRate,
    volumeControls,
    playbackControls,
    formatTime,
    changePlaybackRate,
    howler
  } = useAudioPlayer(file, onEnded, onError);

  const { isPlaying, progress, duration } = playbackState;

  // Use our media state persistence
  const { 
    updateTime,
    updateVolume,
    updatePlaybackRate,
    updatePlayingState
  } = useMediaStatePersistence(audioIdRef.current, {
    mediaType: "audio",
    fileName: file.name,
    initialPlaybackRate: playbackRate,
    initialVolume: volumeControls.volume[0],
    onTimeRestored: (time) => {
      if (howler.current) {
        howler.current.seek(time);
      }
    }
  });

  // Update our persistence system when playback state changes
  React.useEffect(() => {
    updateTime(progress, duration);
    updatePlayingState(isPlaying);
  }, [progress, duration, isPlaying]);

  // Update volume in persistence when it changes
  React.useEffect(() => {
    updateVolume(volumeControls.volume[0]);
  }, [volumeControls.volume]);

  // Update playback rate in persistence when it changes
  React.useEffect(() => {
    updatePlaybackRate(playbackRate);
  }, [playbackRate]);

  // Handle visibility changes
  useVisibilityChange({
    onHidden: () => {
      if (howler.current && isPlaying) {
        updateTime(howler.current.seek() as number, howler.current.duration() as number);
      }
    }
  });

  return (
    <div className="w-full bg-white/10 dark:bg-black/20 backdrop-blur-md rounded-xl p-4 shadow-xl transition-all duration-300">
      <AudioPlayerHeader fileName={file.name} />

      <ProgressBar 
        progress={progress} 
        duration={duration} 
        onSeek={playbackControls.handleSeek} 
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
