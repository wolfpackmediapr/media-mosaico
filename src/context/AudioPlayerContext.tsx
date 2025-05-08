
import React, { createContext, useContext, ReactNode, useCallback, useMemo } from 'react';
import { useAudioPlayer } from '@/components/radio/audio-player/hooks/useAudioPlayer';
import { AudioPlayerState, AudioControls } from '@/types/player';

// Combined interface for the context
interface AudioPlayerContextType extends AudioPlayerState, AudioControls {
  isLoading: boolean;
  isReady: boolean;
  errors: any;
  metadata: any;
  playbackErrors?: string | null;
  seekToTimestamp: (time: number) => void;
  tryUseStorageUrl?: () => boolean;
}

// Default values for the context
const defaultContext: AudioPlayerContextType = {
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  isMuted: false,
  volume: [50],
  playbackRate: 1,
  isLoading: false,
  isReady: false,
  errors: null,
  metadata: null,
  playbackErrors: null,
  onPlayPause: () => {},
  onSeek: () => {},
  onSkip: () => {},
  onToggleMute: () => {},
  onVolumeChange: () => {},
  onPlaybackRateChange: () => {},
  seekToTimestamp: () => {}
};

// Create the context
const AudioPlayerContext = createContext<AudioPlayerContextType>(defaultContext);

// Props interface for the provider
interface AudioPlayerProviderProps {
  children: ReactNode;
  file?: File;
  onEnded?: () => void;
  onError?: (error: string) => void;
}

/**
 * Provider component that wraps the application to provide audio player functionality
 */
export const AudioPlayerProvider = ({
  children,
  file,
  onEnded,
  onError
}: AudioPlayerProviderProps) => {
  // Use the audio player hook
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
    seekToTimestamp,
    tryUseStorageUrl
  } = useAudioPlayer({
    file: file || new File([], "placeholder"),
    onEnded,
    onError
  });

  // Volume conversion helpers
  const normalizedVolume = useMemo(() => {
    // Normalize to array form consistently
    return Array.isArray(volume) ? volume : [volume * 100];
  }, [volume]);

  // Create the context value
  const contextValue = useMemo(() => ({
    isPlaying,
    currentTime,
    duration,
    isMuted,
    volume: normalizedVolume,
    playbackRate,
    isLoading,
    isReady,
    errors: playbackErrors,
    metadata: null, // Can be extended when needed
    onPlayPause: handlePlayPause,
    onSeek: handleSeek,
    onSkip: handleSkip,
    onToggleMute: handleToggleMute,
    onVolumeChange: handleVolumeChange,
    onPlaybackRateChange: handlePlaybackRateChange,
    seekToTimestamp,
    tryUseStorageUrl
  }), [
    isPlaying,
    currentTime,
    duration,
    isMuted,
    normalizedVolume,
    playbackRate,
    isLoading,
    isReady,
    playbackErrors,
    handlePlayPause,
    handleSeek,
    handleSkip,
    handleToggleMute,
    handleVolumeChange,
    handlePlaybackRateChange,
    seekToTimestamp,
    tryUseStorageUrl
  ]);

  return (
    <AudioPlayerContext.Provider value={contextValue}>
      {children}
    </AudioPlayerContext.Provider>
  );
};

/**
 * Hook to use the audio player context
 */
export const useAudioPlayerContext = () => {
  const context = useContext(AudioPlayerContext);
  
  if (context === undefined) {
    throw new Error('useAudioPlayerContext must be used within an AudioPlayerProvider');
  }
  
  return context;
};
