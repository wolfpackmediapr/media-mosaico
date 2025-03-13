
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { useJobManagement } from "@/hooks/use-job-management";
import { useFileProcessing } from "@/hooks/use-file-processing";
import { PressClipping, ProcessingJob } from "@/types/pdf-processing";

export const usePdfProcessing = () => {
  const { toast } = useToast();
  const [clippings, setClippings] = useState<PressClipping[]>([]);
  const [publicationName, setPublicationName] = useState("");
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [processingComplete, setProcessingComplete] = useState(false);

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
            setClippings(data.clippings);
            setProcessingComplete(true);
            setIsUploading(false);
            setProcessingError(null);
            
            toast({
              title: "PDF procesado exitosamente",
              description: `Se encontraron ${data.clippings.length} recortes de prensa`,
            });
          } else {
            console.log("No clippings found in completed job");
            setIsUploading(false);
            setProcessingError("No se encontraron recortes en el PDF");
            setProcessingComplete(true);
            
            toast({
              title: "Proceso completado",
              description: "No se encontraron recortes en el PDF proporcionado",
              variant: "destructive"
            });
          }
        } catch (error) {
          console.error("Error checking job status:", error);
          setIsUploading(false);
          setProcessingError("Error al verificar el estado del procesamiento");
          
          toast({
            title: "Error al procesar el PDF",
            description: "Ocurrió un error al verificar el estado del procesamiento",
            variant: "destructive"
          });
        }
      })();
    } else if (currentJob.status === 'error') {
      console.error("Job error:", currentJob.error);
      setIsUploading(false);
      setProcessingError(currentJob.error || "Error desconocido");
      
      toast({
        title: "Error al procesar el PDF",
        description: currentJob.error || "No se pudo procesar el archivo PDF",
        variant: "destructive"
      });
    }
  }, [currentJob?.status, checkJobStatus, setIsUploading, toast, processingComplete]);

  const processFile = useCallback(async (file: File, newPublicationName: string) => {
    try {
      setIsUploading(true);
      setUploadProgress(0);
      setPublicationName(newPublicationName);
      setClippings([]);
      setProcessingError(null);
      setProcessingComplete(false);

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
        setClippings(processingResult.clippings);
        setProcessingComplete(true);
        setIsUploading(false);
        
        // Update job to completed
        setCurrentJob({
          ...typedJob,
          status: 'completed',
          progress: 100
        });
        
        toast({
          title: "PDF procesado exitosamente",
          description: `Se encontraron ${processingResult.clippings.length} recortes de prensa`,
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
      setProcessingError(error instanceof Error ? error.message : "Error desconocido");
      
      toast({
        title: "Error al procesar el PDF",
        description: error instanceof Error ? error.message : "No se pudo procesar el archivo PDF",
        variant: "destructive"
      });
      
      setIsUploading(false);
      setCurrentJob(null);
    }
  }, [uploadFile, triggerProcessing, setCurrentJob, setUploadProgress, toast]);

  const resetProcessing = useCallback(() => {
    setClippings([]);
    setPublicationName("");
    setProcessingError(null);
    setProcessingComplete(false);
    setCurrentJob(null);
    setUploadProgress(0);
    setIsUploading(false);
  }, [setCurrentJob, setIsUploading]);

  const cancelProcessing = useCallback(() => {
    cancelCurrentJob();
    setIsUploading(false);
    setProcessingError("Procesamiento cancelado por el usuario");
    
    toast({
      title: "Procesamiento cancelado",
      description: "El procesamiento del PDF ha sido cancelado",
      variant: "default"
    });
  }, [cancelCurrentJob, toast]);

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
    cancelProcessing
  };
};

export type { PressClipping, ProcessingJob } from "@/types/pdf-processing";
