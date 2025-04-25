
import { useEffect } from 'react';

interface MediaSessionOptions {
  title?: string;
  artist?: string;
  album?: string;
  artwork?: Array<{
    src: string;
    sizes: string;
    type: string;
  }>;
  onPlay?: () => void;
  onPause?: () => void;
  onSeekBackward?: (details: MediaSessionActionDetails) => void;
  onSeekForward?: (details: MediaSessionActionDetails) => void;
  onPreviousTrack?: () => void;
  onNextTrack?: () => void;
  onStop?: () => void;
  duration?: number;
  position?: number;
}

/**
 * Hook for integrating with the Media Session API to enable browser/OS media controls
 * This helps maintain playback across tabs and enables system notifications
 */
export function useMediaSession(options: MediaSessionOptions) {
  const {
    title,
    artist,
    album,
    artwork,
    onPlay,
    onPause,
    onSeekBackward,
    onSeekForward,
    onPreviousTrack,
    onNextTrack,
    onStop,
    duration,
    position
  } = options;

  // Set up media session metadata and handlers
  useEffect(() => {
    if ('mediaSession' in navigator) {
      // Set metadata for the currently playing media
      navigator.mediaSession.metadata = new MediaMetadata({
        title: title || 'Audio playback',
        artist: artist || '',
        album: album || '',
        artwork: artwork || [
          {
            src: '/icons/audio-player.png',
            sizes: '96x96',
            type: 'image/png'
          }
        ]
      });

      // Update playback position state for lock screen controls
      if (typeof duration === 'number' && typeof position === 'number') {
        try {
          navigator.mediaSession.setPositionState({
            duration,
            position,
            playbackRate: 1.0
          });
        } catch (error) {
          console.warn('Error setting position state:', error);
        }
      }

      // Register action handlers with error handling
      if (onPlay) navigator.mediaSession.setActionHandler('play', onPlay);
      if (onPause) navigator.mediaSession.setActionHandler('pause', onPause);
      if (onStop) navigator.mediaSession.setActionHandler('stop', onStop);
      
      if (onSeekBackward) {
        navigator.mediaSession.setActionHandler('seekbackward', onSeekBackward);
      }
      
      if (onSeekForward) {
        navigator.mediaSession.setActionHandler('seekforward', onSeekForward);
      }
      
      if (onPreviousTrack) {
        navigator.mediaSession.setActionHandler('previoustrack', onPreviousTrack);
      }
      
      if (onNextTrack) {
        navigator.mediaSession.setActionHandler('nexttrack', onNextTrack);
      }

      // Return cleanup function
      return () => {
        // Clear all action handlers on unmount
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
        navigator.mediaSession.setActionHandler('stop', null);
        navigator.mediaSession.setActionHandler('seekbackward', null);
        navigator.mediaSession.setActionHandler('seekforward', null);
        navigator.mediaSession.setActionHandler('previoustrack', null);
        navigator.mediaSession.setActionHandler('nexttrack', null);
      };
    }
    
    return undefined;
  }, [
    title,
    artist,
    album,
    artwork,
    onPlay,
    onPause,
    onSeekBackward,
    onSeekForward,
    onPreviousTrack,
    onNextTrack,
    onStop,
    duration,
    position
  ]);
}

// Add helpful utility for checking if Media Session API is supported
export function isMediaSessionSupported(): boolean {
  return 'mediaSession' in navigator;
}
