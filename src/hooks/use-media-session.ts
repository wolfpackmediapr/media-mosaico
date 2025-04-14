
import { useEffect } from "react";

interface MediaSessionOptions {
  title?: string;
  artist?: string;
  album?: string;
  artwork?: MediaImage[];
  onPlay?: () => void;
  onPause?: () => void;
  onSeekBackward?: (details: { seekOffset?: number }) => void;
  onSeekForward?: (details: { seekOffset?: number }) => void;
  onPreviousTrack?: () => void;
  onNextTrack?: () => void;
  mediaId?: string;
}

export function useMediaSession({
  title = "Unknown Title",
  artist = "Unknown Artist",
  album,
  artwork,
  onPlay,
  onPause,
  onSeekBackward,
  onSeekForward,
  onPreviousTrack,
  onNextTrack,
  mediaId
}: MediaSessionOptions) {
  useEffect(() => {
    if (!('mediaSession' in navigator)) {
      return;
    }

    navigator.mediaSession.metadata = new MediaMetadata({
      title,
      artist,
      album,
      artwork
    });

    const actionHandlers: [MediaSessionAction, MediaSessionActionHandler][] = [
      ['play', () => onPlay?.()],
      ['pause', () => onPause?.()],
      ['seekbackward', (details) => onSeekBackward?.(details || { seekOffset: 10 })],
      ['seekforward', (details) => onSeekForward?.(details || { seekOffset: 10 })],
      ['previoustrack', () => onPreviousTrack?.()],
      ['nexttrack', () => onNextTrack?.()]
    ];

    for (const [action, handler] of actionHandlers) {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch (error) {
        console.log(`The media session action "${action}" is not supported.`);
      }
    }

    return () => {
      // Clean up handlers when component unmounts
      for (const [action] of actionHandlers) {
        try {
          navigator.mediaSession.setActionHandler(action, null);
        } catch (error) {
          console.log(`Error cleaning up "${action}" handler:`, error);
        }
      }
    };
  }, [title, artist, album, artwork, onPlay, onPause, onSeekBackward, onSeekForward, onPreviousTrack, onNextTrack]);

  // Update playback state
  const setPlaybackState = (state: MediaSessionPlaybackState) => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = state;
    }
  };

  return { setPlaybackState };
}
