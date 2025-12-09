import { useState, useCallback } from "react";
import { PressClipping, ProcessingJob } from "./types";
import { 
  createProcessingJob, 
  uploadFileToStorage, 
  triggerJobProcessing,
  getFilePathFromJob,
  cleanupFailedJob,
  compressPdfFile,
  processFileWithFileSearch
} from "@/services/prensa/fileProcessor";
import { FEATURES } from "@/config/features";
import { supabase } from "@/integrations/supabase/client";

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
      
      // Check feature flag to determine processing method
      if (FEATURES.USE_FILE_SEARCH) {
        console.log('[FileSearch] Using File Search API flow');
        
        // Get authenticated user
        const { data: authData } = await supabase.auth.getUser();
        if (!authData?.user) {
          throw new Error('Usuario no autenticado');
        }
        
        // Use new File Search flow
        const result = await processFileWithFileSearch(
          file,
          publicationName,
          authData.user.id
        );
        
        console.log('[FileSearch] Upload complete:', result);
        
        // Call onJobCreated with simulated job (for progress UI compatibility)
        onJobCreated({
          id: result.documentId,
          status: 'completed',
          progress: 100,
          publication_name: publicationName,
          document_summary: result.summary,
          document_metadata: {
            summary: result.summary,
            categories: result.categories,
            keywords: result.keywords,
            relevantClients: result.relevantClients,
            totalClippings: result.clippingsCount
          }
        });
        
        // File Search indexes for search instead of returning clippings array
        onProcessingComplete([], publicationName);
        
      } else {
        console.log('[Legacy] Using OCR flow');
        
        // Generate file path once and use it for both job creation and upload
        const filePath = getFilePathFromJob(file.name);
        console.log("Generated file path:", filePath);
        
        // Create processing job with the file path
        const jobData = await createProcessingJob(file.name, publicationName, filePath);
        
        if (!jobData) {
          throw new Error("No se pudo crear el trabajo de procesamiento");
        }
        
        onJobCreated(jobData);
        
        // Upload file to storage using the SAME file path
        await uploadFileToStorage(file, filePath);
        
        // Compress PDF before processing
        console.log("Compressing PDF before AI analysis...");
        const { compressedPath, success } = await compressPdfFile(jobData.id, filePath);
        
        if (success) {
          console.log(`✓ Compression successful, using: ${compressedPath}`);
        } else {
          console.log(`⚠ Using original file: ${filePath}`);
        }
        
        // Trigger processing (fire-and-forget pattern)
        console.log("Triggering processing for job:", jobData.id);
        await triggerJobProcessing(jobData.id);

        // Processing continues in background - polling will detect completion
        console.log("✓ Processing started successfully, polling will track progress");
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
