
import { useAudioPlayer } from './use-audio-player';
import { UploadedFile } from '@/components/radio/types';
import { useEffect, useRef } from 'react';

interface AudioProcessingOptions {
  currentFile?: UploadedFile;
}

export const useAudioProcessing = ({ currentFile }: AudioProcessingOptions) => {
  // Track if component is mounted to prevent memory leaks
  const isMountedRef = useRef(true);

  const {
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    playbackRate,
    handlePlayPause,
    handleSeek,
    handleSkip,
    handleToggleMute,
    handleVolumeChange,
    handlePlaybackRateChange,
    seekToTimestamp
  } = useAudioPlayer({
    file: currentFile
  });

  const handleSeekToSegment = (timestamp: number) => {
    if (isMountedRef.current) {
      seekToTimestamp(timestamp);
    }
  };

  // Cleanup function to prevent memory leaks when component unmounts
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    playbackRate,
    handlePlayPause,
    handleSeek,
    handleSkip,
    handleToggleMute,
    handleVolumeChange,
    handlePlaybackRateChange,
    handleSeekToSegment
  };
};
