
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
        throw jobError;
      }
      
      // Upload the file
      const { error: uploadError } = await supabase.storage
        .from('pdf_uploads')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        throw uploadError;
      }
      
      return jobData;
    } catch (error) {
      console.error("Error uploading file:", error);
      throw error;
    }
  };

  const triggerProcessing = async (jobId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("process-press-pdf", {
        body: { jobId },
      });

      if (error) {
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error("Error triggering processing:", error);
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
