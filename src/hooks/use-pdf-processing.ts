
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PressClipping {
  id: string;
  title: string;
  content: string;
  category: string;
  page_number: number;
  summary_who?: string;
  summary_what?: string;
  summary_when?: string;
  summary_where?: string;
  summary_why?: string;
  keywords?: string[];
  client_relevance?: string[];
}

interface ProcessingJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  error?: string;
  publication_name: string;
}

export const usePdfProcessing = () => {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [clippings, setClippings] = useState<PressClipping[]>([]);
  const [publicationName, setPublicationName] = useState("");
  const [currentJob, setCurrentJob] = useState<ProcessingJob | null>(null);
  const [jobCheckInterval, setJobCheckInterval] = useState<number | null>(null);

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
        
        // If job completed, update clippings
        if (data.job.status === 'completed' && data.clippings?.length > 0) {
          setClippings(data.clippings);
          setIsUploading(false);
          setUploadProgress(100);
          toast({
            title: "PDF procesado exitosamente",
            description: `Se encontraron ${data.clippings.length} recortes de prensa`,
          });
          
          // Clear the job check interval
          if (jobCheckInterval) {
            clearInterval(jobCheckInterval);
            setJobCheckInterval(null);
          }
        } else if (data.job.status === 'error') {
          setIsUploading(false);
          toast({
            title: "Error al procesar el PDF",
            description: data.job.error || "No se pudo procesar el archivo PDF",
            variant: "destructive"
          });
          
          // Clear the job check interval
          if (jobCheckInterval) {
            clearInterval(jobCheckInterval);
            setJobCheckInterval(null);
          }
        }
      }
    } catch (error) {
      console.error("Error checking job status:", error);
    }
  };

  const processFile = async (file: File, newPublicationName: string) => {
    setIsUploading(true);
    setUploadProgress(0);
    setPublicationName(newPublicationName);
    setClippings([]);

    try {
      // Step 1: Upload the file to Supabase Storage
      const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
      const filePath = `${fileName}`;

      // Get the authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("You must be logged in to upload files");
      }

      // Create a new processing job
      const { data: jobData, error: jobError } = await supabase
        .from('pdf_processing_jobs')
        .insert({
          file_path: `pdf_uploads/${filePath}`,
          publication_name: newPublicationName,
          user_id: user.id,
          status: 'pending',
          progress: 0
        })
        .select()
        .single();

      if (jobError) {
        throw jobError;
      }

      setCurrentJob(jobData as ProcessingJob);
      
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

      // Upload the file
      const { error: uploadError } = await supabase.storage
        .from('pdf_uploads')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      clearInterval(uploadProgressInterval);

      if (uploadError) {
        throw uploadError;
      }

      setUploadProgress(50);
      
      // Step 2: Trigger the processing function
      const { data, error } = await supabase.functions.invoke("process-press-pdf", {
        body: { jobId: jobData.id },
      });

      if (error) {
        throw error;
      }
      
      // The process is now running in the background, we'll check its status periodically
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

export type { PressClipping, ProcessingJob };
