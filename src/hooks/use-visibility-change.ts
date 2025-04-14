
import { useEffect } from 'react';

type VisibilityChangeHandler = {
  onHidden?: () => void;
  onVisible?: () => void;
};

/**
 * Hook to handle document visibility changes
 */
export function useVisibilityChange({ onHidden, onVisible }: VisibilityChangeHandler) {
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        onHidden?.();
      } else if (document.visibilityState === 'visible') {
        onVisible?.();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [onHidden, onVisible]);
}
