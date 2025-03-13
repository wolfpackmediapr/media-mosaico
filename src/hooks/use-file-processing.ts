
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useFileProcessing = () => {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const uploadFile = async (file: File, publicationName: string) => {
    setIsUploading(true);
    setUploadError(null);
    
    try {
      console.log(`Starting upload of file: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
      
      // Get the authenticated user
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) {
        console.error("Authentication error:", authError);
        throw new Error("Error de autenticación: " + authError.message);
      }
      
      if (!authData?.user) {
        console.error("No authenticated user found");
        throw new Error("Debes iniciar sesión para subir archivos");
      }

      // Create a file name with timestamp to avoid collisions
      const timestamp = Date.now();
      const sanitizedFileName = file.name.replace(/\s+/g, '_');
      const fileName = `${timestamp}_${sanitizedFileName}`;
      const filePath = `${fileName}`;

      console.log("Creating new processing job...");
      
      // Create a new processing job
      const { data: jobData, error: jobError } = await supabase
        .from('pdf_processing_jobs')
        .insert({
          file_path: `pdf_uploads/${filePath}`,
          publication_name: publicationName,
          user_id: authData.user.id,
          status: 'pending',
          progress: 0
        })
        .select()
        .single();

      if (jobError) {
        console.error("Error creating job:", jobError);
        throw new Error("Error al crear el trabajo de procesamiento: " + jobError.message);
      }
      
      if (!jobData) {
        console.error("No job data returned from database");
        throw new Error("No se recibieron datos del trabajo de procesamiento");
      }
      
      console.log("Job created successfully:", jobData);
      console.log("Uploading file to storage...");
      
      // Upload the file to storage
      const { error: uploadError } = await supabase.storage
        .from('pdf_uploads')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        console.error("Error uploading file:", uploadError);
        
        // Try to delete the job if upload fails
        await supabase
          .from('pdf_processing_jobs')
          .delete()
          .eq('id', jobData.id);
          
        throw new Error("Error al subir el archivo: " + uploadError.message);
      }
      
      console.log("File uploaded successfully");
      return jobData;
    } catch (error) {
      console.error("Error in uploadFile:", error);
      setUploadError(error instanceof Error ? error.message : "Error desconocido");
      throw error;
    } finally {
      // Don't set isUploading to false here - let the calling component manage this
      // based on the overall process flow
    }
  };

  const triggerProcessing = async (jobId: string) => {
    try {
      console.log("Triggering processing for job:", jobId);
      
      const { data, error } = await supabase.functions.invoke("process-press-pdf", {
        body: { jobId },
      });

      if (error) {
        console.error("Error invoking process-press-pdf function:", error);
        // Update job status to error
        await supabase
          .from('pdf_processing_jobs')
          .update({ status: 'error', error: error.message || "Error al procesar el PDF" })
          .eq('id', jobId);
          
        throw new Error("Error al iniciar el procesamiento: " + error.message);
      }
      
      console.log("Processing triggered successfully:", data);
      return data;
    } catch (error) {
      console.error("Error in triggerProcessing:", error);
      setUploadError(error instanceof Error ? error.message : "Error desconocido");
      throw error;
    }
  };

  return {
    isUploading,
    setIsUploading,
    uploadError,
    uploadFile,
    triggerProcessing
  };
};
