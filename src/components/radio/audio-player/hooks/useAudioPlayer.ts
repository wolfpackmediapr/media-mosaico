
import { useHowlerPlayer } from './useHowlerPlayer';
import { useMediaControls } from './useMediaControls';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';

interface AudioPlayerOptions {
  file?: File;
  onEnded?: () => void;
  onError?: (error: string) => void;
  preservePlaybackOnBlur?: boolean;
  resumeOnFocus?: boolean;
}

// This hook maintains the same interface as the previous implementation
// but delegates actual audio handling to useHowlerPlayer
export const useAudioPlayer = (options: AudioPlayerOptions) => {
  const {
    file,
    onEnded,
    onError,
    preservePlaybackOnBlur = true,
    resumeOnFocus = true
  } = options;

  const {
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    playbackRate,
    audioError,
    isLoading,
    isReady,
    handlePlayPause,
    handleSeek,
    handleSkip,
    handleToggleMute,
    handleVolumeChange,
    handlePlaybackRateChange,
    handleVolumeUp,
    handleVolumeDown,
    setIsPlaying
  } = useHowlerPlayer({
    file,
    onEnded,
    onError,
    preservePlaybackOnBlur,
    resumeOnFocus
  });
  
  // Integrate with Media Session API
  useMediaControls({
    onPlay: () => !isPlaying && handlePlayPause(),
    onPause: () => isPlaying && handlePlayPause(),
    onSeekBackward: (details) => handleSkip('backward', details.seekOffset),
    onSeekForward: (details) => handleSkip('forward', details.seekOffset),
    title: file?.name || 'Audio'
  });

  // Setup keyboard shortcuts
  useKeyboardShortcuts({
    onPlayPause: handlePlayPause,
    onSkipBackward: () => handleSkip('backward'),
    onSkipForward: () => handleSkip('forward'),
    onVolumeUp: handleVolumeUp,
    onVolumeDown: handleVolumeDown,
    onToggleMute: handleToggleMute
  });

  // Return the same API that the previous implementation provided
  return {
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    playbackRate,
    audioError,
    isLoading,
    isReady,
    handlePlayPause,
    handleSeek,
    handleSkip,
    handleToggleMute,
    handleVolumeChange,
    handlePlaybackRateChange,
    seekToTimestamp: handleSeek,
    setIsPlaying
  };
};
