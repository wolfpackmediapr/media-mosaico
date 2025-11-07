
import { useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { useJobManagement } from "@/hooks/use-job-management";
import { useFileProcessing } from "@/hooks/use-file-processing";
import { usePdfClippings } from "@/hooks/use-pdf-clippings";
import { PressClipping, ProcessingJob } from "@/types/pdf-processing";

export const usePdfProcessing = () => {
  const { toast } = useToast();
  const {
    clippings,
    setClippings,
    publicationName,
    setPublicationName,
    processingError,
    setProcessingError,
    processingComplete,
    setProcessingComplete,
    resetClippings,
    handleProcessingSuccess,
    handleProcessingError
  } = usePdfClippings();

  const {
    currentJob,
    setCurrentJob,
    uploadProgress,
    setUploadProgress,
    checkJobStatus,
    cancelCurrentJob
  } = useJobManagement();

  const {
    isUploading,
    setIsUploading,
    uploadError,
    uploadFile,
    triggerProcessing
  } = useFileProcessing();

  // Effect to handle job completion and update clippings
  useEffect(() => {
    if (!currentJob) return;
    
    if (currentJob.status === 'completed' && !processingComplete) {
      // This will be triggered when the job status changes to completed
      (async () => {
        try {
          console.log("Job completed, checking for clippings");
          const data = await checkJobStatus();
          
          if (data?.clippings?.length > 0) {
            console.log(`Found ${data.clippings.length} clippings from completed job`);
            handleProcessingSuccess(data.clippings, currentJob.publication_name);
            setIsUploading(false);
          } else {
            console.log("No clippings found in completed job");
            handleProcessingError("No se encontraron recortes en el PDF");
            setIsUploading(false);
          }
        } catch (error) {
          console.error("Error checking job status:", error);
          handleProcessingError("Error al verificar el estado del procesamiento");
          setIsUploading(false);
        }
      })();
    } else if (currentJob.status === 'error') {
      console.error("Job error:", currentJob.error);
      handleProcessingError(currentJob.error || "Error desconocido");
      setIsUploading(false);
    }
  }, [
    currentJob?.status, 
    checkJobStatus, 
    setIsUploading, 
    processingComplete, 
    handleProcessingSuccess, 
    handleProcessingError, 
    currentJob?.publication_name
  ]);

  const processFile = useCallback(async (file: File, newPublicationName: string) => {
    try {
      setIsUploading(true);
      setUploadProgress(0);
      setPublicationName(newPublicationName);
      resetClippings();

      // Show initial progress quickly to give feedback
      const uploadProgressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 45) {
            clearInterval(uploadProgressInterval);
            return 45;
          }
          return prev + 5;
        });
      }, 300);

      console.log(`Starting processing for file: ${file.name}, publication: ${newPublicationName}`);
      
      // Upload file and create job
      const jobData = await uploadFile(file, newPublicationName);
      clearInterval(uploadProgressInterval);
      
      if (!jobData) {
        console.error("No job data returned from uploadFile");
        throw new Error("No se pudo crear el trabajo de procesamiento");
      }
      
      // Create a properly typed job object
      const typedJob: ProcessingJob = {
        id: jobData.id,
        status: jobData.status as "pending" | "processing" | "completed" | "error",
        progress: jobData.progress,
        error: jobData.error,
        publication_name: jobData.publication_name
      };
      
      console.log("Job created:", typedJob);
      setCurrentJob(typedJob);
      setUploadProgress(50);
      
      // Trigger processing
      console.log("Triggering processing for job:", typedJob.id);
      const processingResult = await triggerProcessing(jobData.id);
      
      if (processingResult?.clippings?.length > 0) {
        console.log(`Processing returned ${processingResult.clippings.length} clippings immediately`);
        // If the function returns clippings immediately, use them
        handleProcessingSuccess(processingResult.clippings, newPublicationName);
        setIsUploading(false);
        
        // Update job to completed
        setCurrentJob({
          ...typedJob,
          status: 'completed',
          progress: 100
        });
      } else {
        // Normal case - the job is running in the background
        toast({
          title: "PDF subido exitosamente",
          description: "El archivo está siendo procesado, esto puede tardar unos minutos...",
        });
      }
      
      // Remain in uploading state - will be updated by the job status effect
    } catch (error) {
      console.error("Error processing PDF:", error);
      handleProcessingError(error instanceof Error ? error.message : "Error desconocido");
      setIsUploading(false);
      setCurrentJob(null);
    }
  }, [
    uploadFile, 
    triggerProcessing, 
    setCurrentJob, 
    setUploadProgress, 
    toast, 
    setPublicationName, 
    resetClippings, 
    handleProcessingSuccess, 
    handleProcessingError
  ]);

  const resetProcessing = useCallback(() => {
    resetClippings();
    setCurrentJob(null);
    setUploadProgress(0);
    setIsUploading(false);
  }, [resetClippings, setCurrentJob, setIsUploading]);

  const cancelProcessing = useCallback(() => {
    cancelCurrentJob();
    setIsUploading(false);
    setProcessingError("Procesamiento cancelado por el usuario");
    
    toast({
      title: "Procesamiento cancelado",
      description: "El procesamiento del PDF ha sido cancelado",
      variant: "default"
    });
  }, [cancelCurrentJob, setProcessingError, toast]);

  return {
    isUploading,
    uploadProgress,
    clippings,
    publicationName,
    processingError,
    processingComplete,
    processFile,
    setClippings,
    resetProcessing,
    cancelProcessing,
    currentJob
  };
};

export type { PressClipping, ProcessingJob } from "@/types/pdf-processing";
