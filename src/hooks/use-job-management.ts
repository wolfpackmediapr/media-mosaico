
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ProcessingJob } from "@/types/pdf-processing";

export const useJobManagement = () => {
  const { toast } = useToast();
  const [currentJob, setCurrentJob] = useState<ProcessingJob | null>(null);
  const [jobCheckInterval, setJobCheckInterval] = useState<number | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isCheckingJob, setIsCheckingJob] = useState(false);
  const [consecutiveErrors, setConsecutiveErrors] = useState(0);
  const [lastCheckTimestamp, setLastCheckTimestamp] = useState<number>(0);
  const MAX_CONSECUTIVE_ERRORS = 3;
  const MIN_CHECK_INTERVAL = 3000; // At least 3 seconds between checks

  // Effect to check job status periodically
  useEffect(() => {
    if (currentJob && currentJob.status !== 'completed' && currentJob.status !== 'error') {
      console.log("Setting up job check interval for job:", currentJob.id);
      const interval = setInterval(async () => {
        const now = Date.now();
        // Only check if we're not already checking and enough time has passed
        if (!isCheckingJob && (now - lastCheckTimestamp) >= MIN_CHECK_INTERVAL) {
          console.log("Checking job status...");
          setLastCheckTimestamp(now);
          checkJobStatus().catch(err => console.error("Error in interval job check:", err));
        }
      }, 3000);
      setJobCheckInterval(Number(interval));
      
      return () => {
        console.log("Clearing job check interval");
        clearInterval(interval);
      };
    } else if (jobCheckInterval) {
      console.log("Clearing job check interval due to job completion or error");
      clearInterval(jobCheckInterval);
      setJobCheckInterval(null);
      setConsecutiveErrors(0);
    }
  }, [currentJob?.id, currentJob?.status, isCheckingJob, lastCheckTimestamp]);

  // Reset job state if we've been stuck for too long
  useEffect(() => {
    if (currentJob && currentJob.status !== 'completed' && currentJob.status !== 'error') {
      // Set up a failsafe timeout - if job has been processing for over 10 minutes, assume there's an issue
      const failsafeTimeout = setTimeout(() => {
        if (currentJob && (currentJob.status === 'pending' || currentJob.status === 'processing')) {
          console.warn("Job has been processing for too long - treating as error");
          setCurrentJob(prev => {
            if (!prev) return null;
            return {
              ...prev,
              status: 'error',
              error: "El procesamiento ha tomado demasiado tiempo. Por favor, intenta nuevamente."
            };
          });
          
          toast({
            title: "Error de procesamiento",
            description: "La operación ha tomado demasiado tiempo. Por favor, intenta nuevamente.",
            variant: "destructive"
          });
        }
      }, 10 * 60 * 1000); // 10 minutes
      
      return () => clearTimeout(failsafeTimeout);
    }
  }, [currentJob?.id, currentJob?.status, toast]);

  const checkJobStatus = useCallback(async () => {
    if (!currentJob?.id) {
      console.log("No current job to check status for");
      return null;
    }
    
    setIsCheckingJob(true);
    
    try {
      console.log(`Checking status for job ${currentJob.id}...`);
      
      const { data, error } = await supabase.functions.invoke("check-pdf-job-status", {
        body: { jobId: currentJob.id },
      });
      
      if (error) {
        console.error("Error checking job status:", error);
        setConsecutiveErrors(prev => prev + 1);
        
        if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
          toast({
            title: "Error",
            description: "Múltiples errores al verificar el estado del proceso",
            variant: "destructive"
          });
          
          // Update the job status to error after max consecutive errors
          setCurrentJob(prev => {
            if (!prev) return null;
            return {
              ...prev,
              status: 'error',
              error: "Error de conexión al verificar el estado"
            };
          });
        }
        
        return null;
      }
      
      // Reset consecutive errors on success
      setConsecutiveErrors(0);
      
      if (data?.job) {
        console.log("Received job status:", data.job);
        // Ensure the status is properly typed
        const jobData = data.job as any;
        const typedJob: ProcessingJob = {
          id: jobData.id,
          status: jobData.status as "pending" | "processing" | "completed" | "error",
          progress: jobData.progress || 0,
          error: jobData.error,
          publication_name: jobData.publication_name
        };
        
        console.log("Updating job status to:", typedJob.status);
        setCurrentJob(typedJob);
        setUploadProgress(jobData.progress || 0);
        return data;
      } else {
        console.log("No job data returned from check-pdf-job-status");
      }
    } catch (error) {
      console.error("Exception checking job status:", error);
      setConsecutiveErrors(prev => prev + 1);
      
      if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        toast({
          title: "Error",
          description: "Error al verificar el estado del proceso",
          variant: "destructive"
        });
      }
    } finally {
      setIsCheckingJob(false);
    }
    
    return null;
  }, [currentJob?.id, toast, consecutiveErrors]);

  // Add a method to manually cancel the current job
  const cancelCurrentJob = useCallback(() => {
    if (!currentJob) return;
    
    // Clear any intervals
    if (jobCheckInterval) {
      clearInterval(jobCheckInterval);
      setJobCheckInterval(null);
    }
    
    // Update job status to error/cancelled
    setCurrentJob(prev => {
      if (!prev) return null;
      return {
        ...prev,
        status: 'error',
        error: "Procesamiento cancelado por el usuario"
      };
    });
    
    setConsecutiveErrors(0);
    setIsCheckingJob(false);
    
    console.log("Job cancelled by user:", currentJob.id);
  }, [currentJob, jobCheckInterval]);

  return {
    currentJob,
    setCurrentJob,
    jobCheckInterval,
    setJobCheckInterval,
    uploadProgress,
    setUploadProgress,
    checkJobStatus,
    cancelCurrentJob
  };
};
