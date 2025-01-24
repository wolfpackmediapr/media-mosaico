import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export const useFileUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const uploadFile = async (file: File) => {
    if (!file.type.startsWith("video/")) {
      toast({
        title: "Error",
        description: "Por favor, sube únicamente archivos de video.",
        variant: "destructive",
      });
      return null;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Error",
        description: "Debes iniciar sesión para subir archivos.",
        variant: "destructive",
      });
      return null;
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;

    try {
      setIsUploading(true);
      setUploadProgress(0);

      const options = {
        cacheControl: '3600',
        upsert: false,
      };

      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(fileName, file, options);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('transcriptions')
        .insert({
          user_id: user.id,
          original_file_path: fileName,
          status: file.size > 25 * 1024 * 1024 ? 'needs_conversion' : 'pending',
          channel: 'Canal Example',
          program: 'Programa Example',
          category: 'Noticias',
          broadcast_time: new Date().toISOString(),
          keywords: ['ejemplo', 'prueba']
        });

      if (dbError) throw dbError;

      setIsUploading(false);
      setUploadProgress(100);

      toast({
        title: "Archivo subido exitosamente",
        description: file.size > 25 * 1024 * 1024 
          ? "El archivo será convertido a audio automáticamente."
          : "Listo para procesar la transcripción.",
      });

      return { fileName, preview: URL.createObjectURL(file) };
    } catch (error) {
      console.error('Error uploading file:', error);
      setIsUploading(false);
      toast({
        title: "Error al subir el archivo",
        description: error.message || "No se pudo procesar el archivo. Por favor, intenta nuevamente.",
        variant: "destructive",
      });
      return null;
    }
  };

  return {
    isUploading,
    uploadProgress,
    uploadFile,
  };
};