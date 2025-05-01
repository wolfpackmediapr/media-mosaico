
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
      const activeElement = document.activeElement;
      const isEditable = activeElement instanceof HTMLInputElement ||
                         activeElement instanceof HTMLTextAreaElement ||
                         activeElement?.getAttribute('contentEditable') === 'true';
      
      if (isEditable) {
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

    // Cleanup function
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
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
