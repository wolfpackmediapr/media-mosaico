
import { useState, useEffect, useRef } from 'react';
import { useHowlerPlayer } from './useHowlerPlayer';
import { useMediaControls } from './useMediaControls';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';
import { validateAudioFile, ensureFileExtension } from '@/utils/file-validation';
import { validateAudioURL } from '@/utils/audio-format-helper';
import { toast } from 'sonner';

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
  
  // Validate file before passing to player
  const validateAndProcessFile = async (fileToProcess?: File) => {
    if (!fileToProcess) return fileToProcess;

    try {
      // Ensure filename has extension - critical for format detection
      if (fileToProcess.name && !fileToProcess.name.includes('.')) {
        // Create a new file with corrected name
        const newFileName = ensureFileExtension(fileToProcess.name, 'mp3');
        Object.defineProperty(fileToProcess, 'name', {
          writable: true,
          value: newFileName
        });
        console.log(`[AudioPlayer] Fixed missing extension: ${newFileName}`);
      }
      
      // For files loaded from persistent state, ensure they have required properties
      if (!fileToProcess.type) {
        const extension = fileToProcess.name.split('.').pop()?.toLowerCase();
        const mimeType = extension === 'mp3' ? 'audio/mpeg' : 
                       extension === 'wav' ? 'audio/wav' : 
                       `audio/${extension}`;
                       
        Object.defineProperty(fileToProcess, 'type', {
          writable: true,
          value: mimeType
        });
        console.log(`[AudioPlayer] Added missing MIME type: ${mimeType}`);
      }
      
      return fileToProcess;
    } catch (err) {
      console.error('[AudioPlayer] Error validating file:', err);
      if (onError) onError('Error validating audio file');
      return fileToProcess; // Return original file even if validation fails
    }
  };

  // Process the file before usage
  const processedFile = file ? validateAndProcessFile(file) : undefined;
  
  const {
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    playbackRate,
    playbackErrors,
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
    onError
  });
  
  // Integrate with Media Session API
  useMediaControls({
    onPlay: () => !isPlaying && handlePlayPause(),
    onPause: () => isPlaying && handlePlayPause(),
    onSeekBackward: () => handleSkip('backward'),
    onSeekForward: () => handleSkip('forward'),
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
    playbackErrors,
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
