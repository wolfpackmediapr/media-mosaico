
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useFileProcessing = () => {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);

  const uploadFile = async (file: File, publicationName: string) => {
    try {
      // Get the authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("You must be logged in to upload files");
      }

      // Create a file name
      const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
      const filePath = `${fileName}`;

      console.log("Creating new processing job...");
      
      // Create a new processing job
      const { data: jobData, error: jobError } = await supabase
        .from('pdf_processing_jobs')
        .insert({
          file_path: `pdf_uploads/${filePath}`,
          publication_name: publicationName,
          user_id: user.id,
          status: 'pending',
          progress: 0
        })
        .select()
        .single();

      if (jobError) {
        console.error("Error creating job:", jobError);
        throw new Error("Error creating processing job: " + jobError.message);
      }
      
      if (!jobData) {
        throw new Error("No job data returned from database");
      }
      
      console.log("Job created:", jobData);
      console.log("Uploading file to storage...");
      
      // Upload the file
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
          
        throw new Error("Error uploading file: " + uploadError.message);
      }
      
      console.log("File uploaded successfully");
      return jobData;
    } catch (error) {
      console.error("Error in uploadFile:", error);
      throw error;
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
        throw new Error("Error triggering processing: " + error.message);
      }
      
      console.log("Processing triggered successfully:", data);
      return data;
    } catch (error) {
      console.error("Error in triggerProcessing:", error);
      throw error;
    }
  };

  return {
    isUploading,
    setIsUploading,
    uploadFile,
    triggerProcessing
  };
};
