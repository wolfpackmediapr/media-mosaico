import { useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { useJobManagement } from "./useJobManagement";
import { usePdfClippings } from "./usePdfClippings";
import { useFileProcessing } from "./useFileProcessing";
import { PressClipping, ProcessingJob } from "./types";
import { PROCESSING_CONFIG, SUCCESS_MESSAGES } from "./constants";
import { handleError } from "./errors";

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
    processFile: processFileInternal
  } = useFileProcessing({
    onJobCreated: (job: ProcessingJob) => {
      setCurrentJob(job);
      setUploadProgress(PROCESSING_CONFIG.POST_UPLOAD_PROGRESS);
    },
    onProcessingComplete: (clippings: PressClipping[], publication: string) => {
      handleProcessingSuccess(clippings, publication);
      setIsUploading(false);
      setCurrentJob(prev => prev ? { ...prev, status: 'completed', progress: 100 } : null);
    },
    onProcessingError: (error: string) => {
      handleProcessingError(error);
      setIsUploading(false);
      setCurrentJob(null);
    }
  });

  // Monitor job completion
  useCallback(() => {
    if (!currentJob) return;
    
    if (currentJob.status === 'completed' && !processingComplete) {
      (async () => {
        try {
          console.log("Job completed, checking for clippings");
          const data = await checkJobStatus();
          
          if (data?.clippings?.length) {
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

      // Animate upload progress
      const uploadProgressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= PROCESSING_CONFIG.INITIAL_UPLOAD_PROGRESS_TARGET) {
            clearInterval(uploadProgressInterval);
            return PROCESSING_CONFIG.INITIAL_UPLOAD_PROGRESS_TARGET;
          }
          return prev + PROCESSING_CONFIG.UPLOAD_PROGRESS_INCREMENT;
        });
      }, PROCESSING_CONFIG.UPLOAD_PROGRESS_ANIMATION_MS);

      console.log(`Starting processing for file: ${file.name}, publication: ${newPublicationName}`);
      
      await processFileInternal(file, newPublicationName);
      
      clearInterval(uploadProgressInterval);
      
      toast({
        title: SUCCESS_MESSAGES.PDF_UPLOADED,
        description: SUCCESS_MESSAGES.PDF_PROCESSING,
      });
    } catch (error) {
      console.error("Error processing PDF:", error);
      const errorMessage = handleError(error, "Error desconocido");
      handleProcessingError(errorMessage);
      setIsUploading(false);
      setCurrentJob(null);
    }
  }, [
    processFileInternal,
    setCurrentJob,
    setUploadProgress,
    setPublicationName,
    resetClippings,
    handleProcessingError,
    setIsUploading
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
    setProcessingError(SUCCESS_MESSAGES.PROCESSING_CANCELLED_DESC);
    
    toast({
      title: SUCCESS_MESSAGES.PROCESSING_CANCELLED,
      description: SUCCESS_MESSAGES.PROCESSING_CANCELLED_DESC,
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

export type { PressClipping, ProcessingJob } from "./types";
