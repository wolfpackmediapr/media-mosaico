
import { useEffect } from 'react';

interface KeyboardShortcutsOptions {
  onPlayPause?: () => void;
  onSkipBackward?: () => void;
  onSkipForward?: () => void;
  onVolumeUp?: () => void;
  onVolumeDown?: () => void;
  onToggleMute?: () => void;
  disabled?: boolean;
}

export const useKeyboardShortcuts = ({
  onPlayPause,
  onSkipBackward,
  onSkipForward,
  onVolumeUp,
  onVolumeDown,
  onToggleMute,
  disabled = false
}: KeyboardShortcutsOptions) => {
  useEffect(() => {
    if (disabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Only activate if no input, textarea or other editable element is focused
      if (
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement ||
        document.activeElement?.getAttribute('contentEditable') === 'true'
      ) {
        return;
      }

      switch (e.key) {
        case ' ':
        case 'k':
          if (onPlayPause) {
            e.preventDefault();
            onPlayPause();
          }
          break;
        case 'ArrowLeft':
        case 'j':
          if (onSkipBackward) {
            e.preventDefault();
            onSkipBackward();
          }
          break;
        case 'ArrowRight':
        case 'l':
          if (onSkipForward) {
            e.preventDefault();
            onSkipForward();
          }
          break;
        case 'ArrowUp':
          if (onVolumeUp) {
            e.preventDefault();
            onVolumeUp();
          }
          break;
        case 'ArrowDown':
          if (onVolumeDown) {
            e.preventDefault();
            onVolumeDown();
          }
          break;
        case 'm':
          if (onToggleMute) {
            e.preventDefault();
            onToggleMute();
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.addEventListener('keydown', handleKeyDown);
    };
  }, [
    onPlayPause,
    onSkipBackward,
    onSkipForward,
    onVolumeUp,
    onVolumeDown,
    onToggleMute,
    disabled
  ]);
};
