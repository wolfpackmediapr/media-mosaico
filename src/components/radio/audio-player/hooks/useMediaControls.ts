
import { useEffect } from 'react';
import { toast } from 'sonner';

interface MediaControlsOptions {
  onPlay: () => void;
  onPause: () => void;
  onSeekBackward: (details: { seekOffset?: number }) => void;
  onSeekForward: (details: { seekOffset?: number }) => void;
  title?: string;
}

export const useMediaControls = ({
  onPlay,
  onPause,
  onSeekBackward,
  onSeekForward,
  title = 'Audio Player'
}: MediaControlsOptions) => {
  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title,
        artist: 'Transcripción de Audio'
      });

      navigator.mediaSession.setActionHandler('play', () => onPlay());
      navigator.mediaSession.setActionHandler('pause', () => onPause());
      navigator.mediaSession.setActionHandler('seekbackward', (details) => onSeekBackward(details));
      navigator.mediaSession.setActionHandler('seekforward', (details) => onSeekForward(details));

      return () => {
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
        navigator.mediaSession.setActionHandler('seekbackward', null);
        navigator.mediaSession.setActionHandler('seekforward', null);
      };
    }
  }, [onPlay, onPause, onSeekBackward, onSeekForward, title]);
};
