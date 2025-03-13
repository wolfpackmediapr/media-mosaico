
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useJobManagement } from "@/hooks/use-job-management";
import { useFileProcessing } from "@/hooks/use-file-processing";
import { PressClipping, ProcessingJob } from "@/types/pdf-processing";

export const usePdfProcessing = () => {
  const { toast } = useToast();
  const [clippings, setClippings] = useState<PressClipping[]>([]);
  const [publicationName, setPublicationName] = useState("");

  const {
    currentJob,
    setCurrentJob,
    uploadProgress,
    setUploadProgress,
    checkJobStatus
  } = useJobManagement();

  const {
    isUploading,
    setIsUploading,
    uploadFile,
    triggerProcessing
  } = useFileProcessing();

  // Effect to handle job completion and update clippings
  useEffect(() => {
    if (currentJob?.status === 'completed') {
      // This will be triggered when the job status changes to completed
      (async () => {
        try {
          const data = await checkJobStatus();
          if (data?.clippings?.length > 0) {
            setClippings(data.clippings);
            setIsUploading(false);
            toast({
              title: "PDF procesado exitosamente",
              description: `Se encontraron ${data.clippings.length} recortes de prensa`,
            });
          }
        } catch (error) {
          console.error("Error checking job status:", error);
          setIsUploading(false);
          toast({
            title: "Error al procesar el PDF",
            description: "Ocurrió un error al verificar el estado del procesamiento",
            variant: "destructive"
          });
        }
      })();
    } else if (currentJob?.status === 'error') {
      setIsUploading(false);
      toast({
        title: "Error al procesar el PDF",
        description: currentJob.error || "No se pudo procesar el archivo PDF",
        variant: "destructive"
      });
    }
  }, [currentJob?.status, checkJobStatus, setIsUploading, toast]);

  const processFile = async (file: File, newPublicationName: string) => {
    try {
      setIsUploading(true);
      setUploadProgress(0);
      setPublicationName(newPublicationName);
      setClippings([]);

      // Simulate upload progress
      const uploadProgressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 45) {
            clearInterval(uploadProgressInterval);
            return 45;
          }
          return prev + 5;
        });
      }, 300);

      // Upload file and create job
      const jobData = await uploadFile(file, newPublicationName);
      clearInterval(uploadProgressInterval);
      
      if (!jobData) {
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
      
      setCurrentJob(typedJob);
      setUploadProgress(50);
      
      // Trigger processing
      await triggerProcessing(jobData.id);
      
      toast({
        title: "PDF subido exitosamente",
        description: "El archivo está siendo procesado, esto puede tardar unos minutos...",
      });
    } catch (error) {
      console.error("Error processing PDF:", error);
      toast({
        title: "Error al procesar el PDF",
        description: error instanceof Error ? error.message : "No se pudo procesar el archivo PDF",
        variant: "destructive"
      });
      setIsUploading(false);
      setCurrentJob(null);
    }
  };

  return {
    isUploading,
    uploadProgress,
    clippings,
    publicationName,
    processFile,
    setClippings
  };
};

export type { PressClipping, ProcessingJob } from "@/types/pdf-processing";
