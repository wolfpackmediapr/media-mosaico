import { useState, useEffect, useCallback, useRef } from "react";
import { PROCESSING_CONFIG } from "./constants";

interface UseJobPollingProps {
  jobId: string | null;
  isActive: boolean;
  onPoll: () => Promise<void>;
  minInterval?: number;
}

export const useJobPolling = ({
  jobId,
  isActive,
  onPoll,
  minInterval = PROCESSING_CONFIG.JOB_CHECK_INTERVAL_MS
}: UseJobPollingProps) => {
  const [isPolling, setIsPolling] = useState(false);
  const [lastPollTimestamp, setLastPollTimestamp] = useState<number>(0);
  const intervalRef = useRef<number | null>(null);

  const startPolling = useCallback(() => {
    if (!isActive || !jobId) return;

    console.log("Setting up job check interval for job:", jobId);
    
    const interval = setInterval(async () => {
      const now = Date.now();
      if (!isPolling && (now - lastPollTimestamp) >= minInterval) {
        console.log("Checking job status...");
        setLastPollTimestamp(now);
        setIsPolling(true);
        try {
          await onPoll();
        } catch (error) {
          console.error("Error in polling:", error);
        } finally {
          setIsPolling(false);
        }
      }
    }, minInterval);

    intervalRef.current = Number(interval);
  }, [isActive, jobId, isPolling, lastPollTimestamp, minInterval, onPoll]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      console.log("Clearing job check interval");
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      setIsPolling(false);
    }
  }, []);

  useEffect(() => {
    if (isActive && jobId) {
      startPolling();
    } else {
      stopPolling();
    }

    return () => {
      stopPolling();
    };
  }, [isActive, jobId, startPolling, stopPolling]);

  return {
    isPolling,
    startPolling,
    stopPolling
  };
};
