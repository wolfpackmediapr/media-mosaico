import { useState, useCallback } from "react";
import { PressClipping, ProcessingJob } from "./types";
import { 
  createProcessingJob, 
  uploadFileToStorage, 
  triggerJobProcessing,
  getFilePathFromJob,
  cleanupFailedJob 
} from "@/services/prensa/fileProcessor";

interface UseFileProcessingProps {
  onJobCreated: (job: ProcessingJob) => void;
  onProcessingComplete: (clippings: PressClipping[], publication: string) => void;
  onProcessingError: (error: string) => void;
}

export const useFileProcessing = ({
  onJobCreated,
  onProcessingComplete,
  onProcessingError
}: UseFileProcessingProps) => {
  const [isUploading, setIsUploading] = useState(false);

  const processFile = useCallback(async (file: File, publicationName: string) => {
    setIsUploading(true);
    
    try {
      console.log(`Starting upload of file: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
      
      // Create processing job
      const jobData = await createProcessingJob(file.name, publicationName);
      
      if (!jobData) {
        throw new Error("No se pudo crear el trabajo de procesamiento");
      }
      
      onJobCreated(jobData);
      
      // Upload file to storage
      const filePath = getFilePathFromJob(file.name);
      await uploadFileToStorage(file, filePath);
      
      // Trigger processing
      console.log("Triggering processing for job:", jobData.id);
      const processingResult = await triggerJobProcessing(jobData.id);
      
      if (processingResult?.clippings?.length > 0) {
        console.log(`Processing returned ${processingResult.clippings.length} clippings immediately`);
        onProcessingComplete(processingResult.clippings, publicationName);
      }
      
      // Note: We don't set isUploading to false here - it will be managed by the parent hook
    } catch (error) {
      console.error("Error in processFile:", error);
      const errorMessage = error instanceof Error ? error.message : "Error desconocido";
      onProcessingError(errorMessage);
      setIsUploading(false);
      throw error;
    }
  }, [onJobCreated, onProcessingComplete, onProcessingError]);

  return {
    isUploading,
    setIsUploading,
    processFile
  };
};
