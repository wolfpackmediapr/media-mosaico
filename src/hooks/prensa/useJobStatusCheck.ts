import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ProcessingJob, JobStatusResponse } from "./types";
import { ERROR_MESSAGES } from "./constants";
import { showErrorToast } from "./errors";

export const useJobStatusCheck = () => {
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [consecutiveErrors, setConsecutiveErrors] = useState(0);

  const checkStatus = useCallback(async (jobId: string): Promise<JobStatusResponse | null> => {
    if (!jobId) {
      console.log("No job ID provided to check status");
      return null;
    }

    setIsChecking(true);
    setError(null);

    try {
      console.log(`Checking status for job ${jobId}...`);

      const { data, error: apiError } = await supabase.functions.invoke("check-pdf-job-status", {
        body: { jobId },
      });

      if (apiError) {
        console.error("Error checking job status:", apiError);
        setConsecutiveErrors(prev => prev + 1);
        setError(apiError.message);
        return null;
      }

      // Reset consecutive errors on success
      setConsecutiveErrors(0);

      if (data?.job) {
        console.log("Received job status:", data.job);
        
        const jobData = data.job as any;
        const typedJob: ProcessingJob = {
          id: jobData.id,
          status: jobData.status as "pending" | "processing" | "completed" | "error",
          progress: jobData.progress || 0,
          error: jobData.error,
          publication_name: jobData.publication_name,
          document_summary: jobData.document_summary
        };

        return {
          job: typedJob,
          clippings: data.clippings
        };
      }

      console.log("No job data returned from check-pdf-job-status");
      return null;
    } catch (err) {
      console.error("Exception checking job status:", err);
      setConsecutiveErrors(prev => prev + 1);
      const errorMessage = err instanceof Error ? err.message : ERROR_MESSAGES.CONNECTION_ERROR;
      setError(errorMessage);
      return null;
    } finally {
      setIsChecking(false);
    }
  }, []);

  return {
    checkStatus,
    isChecking,
    error,
    consecutiveErrors,
    resetErrors: () => {
      setConsecutiveErrors(0);
      setError(null);
    }
  };
};
