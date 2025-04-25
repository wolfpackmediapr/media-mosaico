
import { useAudioPlayer } from './use-audio-player';
import { UploadedFile } from '@/components/radio/types';

interface AudioProcessingOptions {
  currentFile?: UploadedFile;
}

export const useAudioProcessing = ({ currentFile }: AudioProcessingOptions) => {
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
    seekToTimestamp(timestamp);
  };

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
