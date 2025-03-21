
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
  onSeekBackward?: (details: { seekOffset: number }) => void;
  onSeekForward?: (details: { seekOffset: number }) => void;
}

/**
 * Hook for integrating with the Media Session API to enable browser/OS media controls
 */
export function useMediaSession(options: MediaSessionOptions) {
  useEffect(() => {
    if ('mediaSession' in navigator) {
      const {
        title,
        artist,
        album,
        artwork,
        onPlay,
        onPause,
        onSeekBackward,
        onSeekForward
      } = options;
      
      // Set metadata for the currently playing media
      navigator.mediaSession.metadata = new MediaMetadata({
        title,
        artist,
        album,
        artwork
      });
      
      // Set action handlers
      if (onPlay) {
        navigator.mediaSession.setActionHandler('play', onPlay);
      }
      
      if (onPause) {
        navigator.mediaSession.setActionHandler('pause', onPause);
      }
      
      if (onSeekBackward) {
        navigator.mediaSession.setActionHandler('seekbackward', onSeekBackward);
      }
      
      if (onSeekForward) {
        navigator.mediaSession.setActionHandler('seekforward', onSeekForward);
      }
      
      // Return cleanup function
      return () => {
        // Clear all action handlers on unmount
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
        navigator.mediaSession.setActionHandler('seekbackward', null);
        navigator.mediaSession.setActionHandler('seekforward', null);
      };
    }
  }, [options]);
}
