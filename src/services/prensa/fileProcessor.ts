import { supabase } from "@/integrations/supabase/client";
import { ProcessingJob } from "@/hooks/prensa/types";
import { ERROR_MESSAGES } from "@/hooks/prensa/constants";

export const createProcessingJob = async (
  fileName: string,
  publicationName: string
): Promise<ProcessingJob> => {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  
  if (authError) {
    console.error("Authentication error:", authError);
    throw new Error(ERROR_MESSAGES.AUTHENTICATION_ERROR);
  }
  
  if (!authData?.user) {
    console.error("No authenticated user found");
    throw new Error(ERROR_MESSAGES.AUTHENTICATION_ERROR);
  }

  const timestamp = Date.now();
  const sanitizedFileName = fileName.replace(/\s+/g, '_');
  const filePath = `${timestamp}_${sanitizedFileName}`;

  console.log("Creating new processing job...");
  
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
    throw new Error(`${ERROR_MESSAGES.JOB_CREATION_ERROR}: ${jobError.message}`);
  }
  
  if (!jobData) {
    console.error("No job data returned from database");
    throw new Error(ERROR_MESSAGES.JOB_CREATION_ERROR);
  }
  
  console.log("Job created successfully:", jobData);

  return {
    id: jobData.id,
    status: jobData.status as "pending" | "processing" | "completed" | "error",
    progress: jobData.progress || 0,
    error: jobData.error,
    publication_name: jobData.publication_name,
    document_summary: jobData.document_summary
  };
};

export const uploadFileToStorage = async (
  file: File,
  filePath: string
): Promise<void> => {
  console.log("Uploading file to storage...");
  
  const { error: uploadError } = await supabase.storage
    .from('pdf_uploads')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true
    });

  if (uploadError) {
    console.error("Error uploading file:", uploadError);
    throw new Error(`${ERROR_MESSAGES.FILE_UPLOAD_ERROR}: ${uploadError.message}`);
  }
  
  console.log("File uploaded successfully");
};

export const triggerJobProcessing = async (jobId: string) => {
  console.log("Triggering processing for job:", jobId);
  
  const { data, error } = await supabase.functions.invoke("process-press-pdf", {
    body: { jobId },
  });

  if (error) {
    console.error("Error invoking process-press-pdf function:", error);
    
    await supabase
      .from('pdf_processing_jobs')
      .update({ 
        status: 'error', 
        error: error.message || ERROR_MESSAGES.PROCESSING_ERROR 
      })
      .eq('id', jobId);
      
    throw new Error(`Error al iniciar el procesamiento: ${error.message}`);
  }
  
  console.log("Processing triggered successfully:", data);
  return data;
};

export const getFilePathFromJob = (fileName: string): string => {
  const timestamp = Date.now();
  const sanitizedFileName = fileName.replace(/\s+/g, '_');
  return `${timestamp}_${sanitizedFileName}`;
};

export const cleanupFailedJob = async (jobId: string): Promise<void> => {
  try {
    await supabase
      .from('pdf_processing_jobs')
      .delete()
      .eq('id', jobId);
  } catch (error) {
    console.error("Error cleaning up failed job:", error);
  }
};
