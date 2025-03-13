
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ProcessingJob } from "@/types/pdf-processing";

export const useJobManagement = () => {
  const { toast } = useToast();
  const [currentJob, setCurrentJob] = useState<ProcessingJob | null>(null);
  const [jobCheckInterval, setJobCheckInterval] = useState<number | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Effect to check job status periodically
  useEffect(() => {
    if (currentJob && currentJob.status !== 'completed' && currentJob.status !== 'error') {
      const interval = setInterval(checkJobStatus, 3000);
      setJobCheckInterval(Number(interval));
      return () => clearInterval(interval);
    } else if (jobCheckInterval) {
      clearInterval(jobCheckInterval);
      setJobCheckInterval(null);
    }
  }, [currentJob]);

  const checkJobStatus = async () => {
    if (!currentJob?.id) return;
    
    try {
      const { data, error } = await supabase.functions.invoke("check-pdf-job-status", {
        body: { jobId: currentJob.id },
      });
      
      if (error) {
        console.error("Error checking job status:", error);
        return;
      }
      
      if (data.job) {
        setCurrentJob(data.job as ProcessingJob);
        setUploadProgress(data.job.progress || 0);
        return data;
      }
    } catch (error) {
      console.error("Error checking job status:", error);
    }
    
    return null;
  };

  return {
    currentJob,
    setCurrentJob,
    jobCheckInterval,
    setJobCheckInterval,
    uploadProgress,
    setUploadProgress,
    checkJobStatus
  };
};
