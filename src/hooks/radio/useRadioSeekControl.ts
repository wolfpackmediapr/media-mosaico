
import { useCallback } from "react";

interface UseRadioSeekControlProps {
  seekToTimestamp: (timestamp: number) => void;
  currentTime: number;
}

export const useRadioSeekControl = ({
  seekToTimestamp,
  currentTime
}: UseRadioSeekControlProps) => {
  const handleSeekToSegment = useCallback((timestamp: number) => {
    console.log(`Seeking to segment timestamp: ${timestamp}ms, audio current time: ${currentTime}s`);
    seekToTimestamp(timestamp);
  }, [seekToTimestamp, currentTime]);

  return {
    handleSeekToSegment
  };
};
