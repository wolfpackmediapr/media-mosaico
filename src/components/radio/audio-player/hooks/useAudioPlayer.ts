import { useState, useEffect, useRef, useCallback } from 'react';
import { Howl } from 'howler';
import { toast } from 'sonner';
import { useMediaControls } from './useMediaControls';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';
import { usePlaybackControls } from './usePlaybackControls';
import { useVolumeControls } from './useVolumeControls';
import { useAudioProgress } from './useAudioProgress';
import { formatTime } from '../utils/timeFormatter';
import { uploadAudioToSupabase } from '@/utils/supabase-storage-helper';
import { ensureValidBlobUrl } from '@/utils/audio-url-validator';
import { useAuthStatus } from '@/hooks/use-auth-status';

interface AudioPlayerOptions {
  file: File;
  onEnded?: () => void;
  onError?: (error: string) => void;
}

export const useAudioPlayer = ({ file, onEnded, onError }: AudioPlayerOptions) => {
  const howler = useRef<Howl | null>(null);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [storedUrl, setStoredUrl] = useState<string | null>(null);
  const [isUploadingToStorage, setIsUploadingToStorage] = useState(false);
  const { isAuthenticated } = useAuthStatus();

  // Enhanced tryUseStorageUrl to actually upload to storage when authenticated
  const tryUseStorageUrl = useCallback(async (): Promise<boolean> => {
    // Don't try to upload if not authenticated
    if (!isAuthenticated || isUploadingToStorage) {
      return Promise.resolve(false);
    }
    
    try {
      setIsUploadingToStorage(true);
      console.log('[useAudioPlayer] Uploading file to storage: ', file.name);
      
      // Use file's storage URL if it exists
      if ('storageUrl' in file && typeof file.storageUrl === 'string') {
        setStoredUrl(file.storageUrl);
        console.log('[useAudioPlayer] Using existing storage URL');
        setIsUploadingToStorage(false);
        return Promise.resolve(true);
      }
      
      // Otherwise upload to storage
      const uploadResult = await uploadAudioToSupabase(file);
      
      if (uploadResult.error) {
        console.error('[useAudioPlayer] Storage upload error:', uploadResult.error);
        setIsUploadingToStorage(false);
        return Promise.resolve(false);
      }
      
      setStoredUrl(uploadResult.url);
      
      // Add storage properties to the file object
      if (file) {
        Object.defineProperty(file, 'storageUrl', {
          value: uploadResult.url,
          writable: true
        });
        
        Object.defineProperty(file, 'storagePath', {
          value: uploadResult.path,
          writable: true
        });
      }
      
      console.log('[useAudioPlayer] File uploaded successfully, URL:', uploadResult.url);
      setIsUploadingToStorage(false);
      return Promise.resolve(true);
    } catch (error) {
      console.error('[useAudioPlayer] Error uploading to storage:', error);
      setIsUploadingToStorage(false);
      return Promise.resolve(false);
    }
  }, [file, isAuthenticated, isUploadingToStorage]);

  useEffect(() => {
    try {
      // Use storage URL if available, otherwise create blob URL
      let fileUrl: string;
      
      if (storedUrl) {
        fileUrl = storedUrl;
        console.log('[useAudioPlayer] Using storage URL for Howl:', fileUrl);
      } else {
        fileUrl = URL.createObjectURL(file);
        console.log('[useAudioPlayer] Created blob URL for Howl:', fileUrl);
      }
      
      const sound = new Howl({
        src: [fileUrl],
        html5: true, // Force HTML5 Audio to avoid streaming issues 
        onplay: () => setIsPlaying(true),
        onpause: () => setIsPlaying(false),
        onend: () => {
          setIsPlaying(false);
          if (onEnded) onEnded();
        },
        onstop: () => setIsPlaying(false),
        onloaderror: (id, error) => {
          console.error('Audio loading error:', error);
          toast.error('Error loading audio file');
          if (onError) onError(`Error loading audio: ${error}`);
          
          // If blob URL fails and we're not already using storage, try using storage
          if (!storedUrl && isAuthenticated) {
            tryUseStorageUrl().then(success => {
              if (success) {
                // Recreate the Howl instance with the storage URL
                if (howler.current) {
                  howler.current.unload();
                }
              }
            });
          }
        },
        onplayerror: (id, error) => {
          console.error('Audio playback error:', error);
          toast.error('Error playing audio file');
          if (onError) onError(`Error playing audio: ${error}`);
        }
      });

      howler.current = sound;

      return () => {
        sound.unload();
        // Only revoke if it's a blob URL, not a storage URL
        if (!storedUrl && fileUrl.startsWith('blob:')) {
          URL.revokeObjectURL(fileUrl);
        }
      };
    } catch (error) {
      console.error('Error initializing audio player:', error);
      toast.error('Error setting up audio player');
      if (onError) onError(`Error initializing audio: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [file, onEnded, onError, storedUrl, isAuthenticated, tryUseStorageUrl]);

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

  // Add explicit handleToggleMute function that uses toggleMute
  const handleToggleMute = useCallback(() => {
    toggleMute();
  }, [toggleMute]);

  return {
    isPlaying,
    currentTime: progress,
    duration: howler.current?.duration() || 0,
    volume,
    isMuted,
    playbackRate,
    handlePlayPause,
    handleSeek,
    handleSkip,
    handleToggleMute,
    handleVolumeChange,
    handlePlaybackRateChange: changePlaybackRate,
    tryUseStorageUrl,
    // Add these properties to match expected interface
    playbackErrors: null,
    isLoading: isUploadingToStorage,
    isReady: !!howler.current,
    seekToTimestamp: handleSeek
  };
};
