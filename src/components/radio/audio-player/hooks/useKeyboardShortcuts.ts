
import { useEffect } from 'react';

interface KeyboardShortcutsOptions {
  onPlayPause: () => void;
  onSkipBackward: () => void;
  onSkipForward: () => void;
  onVolumeUp?: () => void;
  onVolumeDown?: () => void;
}

export const useKeyboardShortcuts = ({
  onPlayPause,
  onSkipBackward,
  onSkipForward,
  onVolumeUp,
  onVolumeDown
}: KeyboardShortcutsOptions) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch(e.key) {
        case ' ':
          e.preventDefault();
          onPlayPause();
          break;
        case 'ArrowLeft':
          onSkipBackward();
          break;
        case 'ArrowRight':
          onSkipForward();
          break;
        case 'ArrowUp':
          if (e.ctrlKey && onVolumeUp) {
            e.preventDefault();
            onVolumeUp();
          }
          break;
        case 'ArrowDown':
          if (e.ctrlKey && onVolumeDown) {
            e.preventDefault();
            onVolumeDown();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onPlayPause, onSkipBackward, onSkipForward, onVolumeUp, onVolumeDown]);
};
