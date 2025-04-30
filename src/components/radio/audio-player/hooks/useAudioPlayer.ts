import { useState, useEffect, useRef } from 'react';
import { Howl } from 'howler';
import { toast } from 'sonner';
import { useMediaControls } from './useMediaControls';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';
import { usePlaybackControls } from './usePlaybackControls';
import { useVolumeControls } from './useVolumeControls';
import { useAudioProgress } from './useAudioProgress';
import { formatTime } from './utils/timeFormatter';

interface AudioPlayerOptions {
  file: File;
  onEnded?: () => void;
  onError?: (error: string) => void;
}

export const useAudioPlayer = ({ file, onEnded, onError }: AudioPlayerOptions) => {
  const howler = useRef<Howl | null>(null);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [audioError, setAudioError] = useState<string | null>(null);

  useEffect(() => {
    console.log('Setting up audio player for file:', file.name);
    try {
      // Determine the best source URL to use
      let fileUrl;
      
      // If the file has a remoteUrl property (uploaded file), use that
      if ('remoteUrl' in file && file.remoteUrl) {
        fileUrl = file.remoteUrl;
        console.log('Using remote URL for audio:', fileUrl);
      } 
      // Otherwise if it has a preview property, use that
      else if ('preview' in file && file.preview) {
        fileUrl = file.preview;
        console.log('Using preview URL for audio:', fileUrl);
      }
      // Last resort: create a new object URL
      else {
        fileUrl = URL.createObjectURL(file);
        console.log('Created new object URL for audio:', fileUrl);
      }

      if (howler.current) {
        howler.current.unload(); // Unload any existing audio
      }

      const sound = new Howl({
        src: [fileUrl],
        html5: true, // Force HTML5 Audio to handle streaming better
        onplay: () => setIsPlaying(true),
        onpause: () => setIsPlaying(false),
        onend: () => {
          setIsPlaying(false);
          if (onEnded) onEnded();
        },
        onstop: () => setIsPlaying(false),
        onloaderror: (id, error) => {
          console.error('Audio loading error:', error);
          const errorMessage = `Error loading audio: ${error || 'Unknown error'}`;
          setAudioError(errorMessage);
          toast.error('Error loading audio file');
          if (onError) onError(errorMessage);
        },
        onplayerror: (id, error) => {
          console.error('Audio playback error:', error);
          const errorMessage = `Error playing audio: ${error || 'Unknown error'}`;
          setAudioError(errorMessage);
          toast.error('Error playing audio file');
          if (onError) onError(errorMessage);
        },
        onload: () => {
          console.log('Audio loaded successfully');
          setAudioError(null); // Clear any previous errors
        }
      });

      howler.current = sound;

      return () => {
        sound.unload();
        // Only revoke the URL if we created it (not for remoteUrl or existing preview)
        if (!('remoteUrl' in file && file.remoteUrl) && !('preview' in file && file.preview)) {
          URL.revokeObjectURL(fileUrl);
        }
      };
    } catch (error) {
      console.error('Error initializing audio player:', error);
      const errorMessage = `Error initializing audio: ${error || 'Unknown error'}`;
      setAudioError(errorMessage);
      toast.error('Error setting up audio player');
      if (onError) onError(errorMessage);
      return () => {};
    }
  }, [file, onEnded, onError]);

  const { isPlaying, handlePlayPause, handleSeek, handleSkip, changePlaybackRate, setIsPlaying } = usePlaybackControls({ 
    howler, 
    duration: howler.current?.duration() || 0 
  });

  const { volume, isMuted, handleVolumeChange, toggleMute } = useVolumeControls();

  const { progress } = useAudioProgress({ howler, file, isPlaying });

  useMediaControls({
    onPlay: () => !isPlaying && handlePlayPause(),
    onPause: () => isPlaying && handlePlayPause(),
    onSeekBackward: (details) => handleSkip('backward', details.seekOffset),
    onSeekForward: (details) => handleSkip('forward', details.seekOffset),
    title: file.name
  });

  useKeyboardShortcuts({
    onPlayPause: handlePlayPause,
    onSkipBackward: () => handleSkip('backward'),
    onSkipForward: () => handleSkip('forward'),
    onVolumeUp: () => {
      const newVolume = Math.min(100, volume[0] + 5);
      handleVolumeChange([newVolume]);
    },
    onVolumeDown: () => {
      const newVolume = Math.max(0, volume[0] - 5);
      handleVolumeChange([newVolume]);
    }
  });

  return {
    isPlaying,
    currentTime: howler.current ? howler.current.seek() as number : 0,
    duration: howler.current ? howler.current.duration() : 0,
    volume,
    isMuted,
    playbackRate,
    audioError,
    handlePlayPause,
    handleSeek,
    handleSkip,
    handleToggleMute,
    handleVolumeChange,
    handlePlaybackRateChange: changePlaybackRate
  };
};
