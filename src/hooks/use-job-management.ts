
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
      console.log("Setting up job check interval for job:", currentJob.id);
      const interval = setInterval(async () => {
        console.log("Checking job status...");
        await checkJobStatus();
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
    }
  }, [currentJob?.id, currentJob?.status]);

  const checkJobStatus = async () => {
    if (!currentJob?.id) {
      console.log("No current job to check status for");
      return null;
    }
    
    try {
      console.log(`Checking status for job ${currentJob.id}...`);
      
      const { data, error } = await supabase.functions.invoke("check-pdf-job-status", {
        body: { jobId: currentJob.id },
      });
      
      if (error) {
        console.error("Error checking job status:", error);
        toast({
          title: "Error",
          description: "Error al verificar el estado del proceso",
          variant: "destructive"
        });
        return null;
      }
      
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
      toast({
        title: "Error",
        description: "Error al verificar el estado del proceso",
        variant: "destructive"
      });
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
