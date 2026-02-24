import { useEffect, useCallback, useRef } from "react";
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
  const isPollingRef = useRef(false);
  const lastPollTimestampRef = useRef<number>(0);
  const intervalRef = useRef<number | null>(null);
  const onPollRef = useRef(onPoll);

  // Keep onPoll ref current without triggering effect reruns
  onPollRef.current = onPoll;

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      console.log("Clearing job check interval");
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      isPollingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!isActive || !jobId) {
      stopPolling();
      return;
    }

    console.log("Setting up job check interval for job:", jobId);

    const interval = setInterval(async () => {
      const now = Date.now();
      if (!isPollingRef.current && (now - lastPollTimestampRef.current) >= minInterval) {
        console.log("Checking job status...");
        lastPollTimestampRef.current = now;
        isPollingRef.current = true;
        try {
          await onPollRef.current();
        } catch (error) {
          console.error("Error in polling:", error);
        } finally {
          isPollingRef.current = false;
        }
      }
    }, minInterval);

    intervalRef.current = Number(interval);

    return () => {
      stopPolling();
    };
  }, [isActive, jobId, minInterval, stopPolling]);

  return {
    isPolling: isPollingRef.current,
    stopPolling
  };
};
