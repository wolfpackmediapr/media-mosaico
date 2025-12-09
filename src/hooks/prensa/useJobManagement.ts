import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { ProcessingJob } from "./types";
import { useJobPolling } from "./useJobPolling";
import { useJobStatusCheck } from "./useJobStatusCheck";
import { PROCESSING_CONFIG, ERROR_MESSAGES } from "./constants";

export const useJobManagement = () => {
  const { toast } = useToast();
  const [currentJob, setCurrentJob] = useState<ProcessingJob | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const { checkStatus, consecutiveErrors, resetErrors } = useJobStatusCheck();

  const handlePoll = useCallback(async () => {
    if (!currentJob?.id) return;
    
    const result = await checkStatus(currentJob.id);
    
    if (result?.job) {
      console.log("Updating job status to:", result.job.status);
      setCurrentJob(result.job);
      setUploadProgress(result.job.progress || 0);
    }
  }, [currentJob?.id, checkStatus]);

  // Don't poll for File Search jobs (they have document_summary immediately)
  const isFileSearchJob = !!currentJob?.document_summary;
  const shouldPoll = !isFileSearchJob && 
    currentJob?.status !== 'completed' && 
    currentJob?.status !== 'error';
    
  const { stopPolling } = useJobPolling({
    jobId: currentJob?.id || null,
    isActive: shouldPoll,
    onPoll: handlePoll
  });

  // Handle consecutive errors
  useEffect(() => {
    if (consecutiveErrors >= PROCESSING_CONFIG.MAX_CONSECUTIVE_ERRORS) {
      toast({
        title: "Error",
        description: ERROR_MESSAGES.MULTIPLE_STATUS_CHECK_ERRORS,
        variant: "destructive"
      });
      
      setCurrentJob(prev => {
        if (!prev) return null;
        return {
          ...prev,
          status: 'error',
          error: ERROR_MESSAGES.CONNECTION_ERROR
        };
      });
    }
  }, [consecutiveErrors, toast]);

  // Failsafe timeout for stuck jobs
  useEffect(() => {
    if (currentJob && currentJob.status !== 'completed' && currentJob.status !== 'error') {
      const failsafeTimeout = setTimeout(() => {
        if (currentJob && (currentJob.status === 'pending' || currentJob.status === 'processing')) {
          console.warn("Job has been processing for too long - treating as error");
          setCurrentJob(prev => {
            if (!prev) return null;
            return {
              ...prev,
              status: 'error',
              error: ERROR_MESSAGES.PROCESSING_TIMEOUT
            };
          });
          
          toast({
            title: "Error de procesamiento",
            description: ERROR_MESSAGES.PROCESSING_TIMEOUT,
            variant: "destructive"
          });
        }
      }, PROCESSING_CONFIG.FAILSAFE_TIMEOUT_MS);
      
      return () => clearTimeout(failsafeTimeout);
    }
  }, [currentJob?.id, currentJob?.status, toast]);

  const cancelCurrentJob = useCallback(() => {
    if (!currentJob) return;
    
    stopPolling();
    
    setCurrentJob(prev => {
      if (!prev) return null;
      return {
        ...prev,
        status: 'error',
        error: ERROR_MESSAGES.PROCESSING_CANCELLED
      };
    });
    
    resetErrors();
    console.log("Job cancelled by user:", currentJob.id);
  }, [currentJob, stopPolling, resetErrors]);

  return {
    currentJob,
    setCurrentJob,
    uploadProgress,
    setUploadProgress,
    checkJobStatus: () => currentJob?.id ? checkStatus(currentJob.id) : Promise.resolve(null),
    cancelCurrentJob
  };
};
