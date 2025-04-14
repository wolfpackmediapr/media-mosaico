
import { useEffect } from "react";

interface VisibilityChangeOptions {
  onVisible?: () => void;
  onHidden?: () => void;
}

export const useVisibilityChange = (options: VisibilityChangeOptions = {}) => {
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        options.onVisible?.();
      } else if (document.visibilityState === "hidden") {
        options.onHidden?.();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [options]);
};
