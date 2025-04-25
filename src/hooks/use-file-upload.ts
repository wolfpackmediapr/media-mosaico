import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Adjust max file size to match Supabase's practical limits
// Supabase can technically handle 5GB files, but for video processing
// we'll set a more conservative limit for reliable processing
const MAX_FILE_SIZE = 80 * 1024 * 1024; // 80MB in bytes

const sanitizeFileName = (fileName: string) => {
  // Remove special characters and spaces, replace with underscores
  const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'));
  const ext = fileName.substring(fileName.lastIndexOf('.'));
  // Replace any non-alphanumeric character (except dots) with underscores
  const sanitized = nameWithoutExt.replace(/[^a-zA-Z0-9]/g, '_');
  return `${sanitized}${ext}`.toLowerCase();
};

export const useFileUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const uploadFile = async (file: File) => {
    if (!file.type.startsWith("video/")) {
      toast.error("Error", {
        description: "Por favor, sube únicamente archivos de video."
      });
      return null;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error("Archivo demasiado grande", {
        description: "El archivo excede el límite de 80MB. Por favor, reduce su tamaño antes de subirlo."
      });
      return null;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Error", {
        description: "Debes iniciar sesión para subir archivos."
      });
      return null;
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);

      const sanitizedFileName = sanitizeFileName(file.name);
      const fileName = `${user.id}/${Date.now()}_${sanitizedFileName}`;

      console.log("Uploading file:", fileName);

      const { data, error: uploadError } = await supabase.storage
        .from('media')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        if (uploadError.message && uploadError.message.includes("too large")) {
          throw new Error("El archivo es demasiado grande para el servicio de almacenamiento. Intenta con un archivo más pequeño.");
        }
        throw uploadError;
      }

      setUploadProgress(100);

      const { error: dbError } = await supabase
        .from('transcriptions')
        .insert({
          user_id: user.id,
          original_file_path: fileName,
          status: file.size > 20 * 1024 * 1024 ? 'needs_conversion' : 'pending',
          channel: 'Canal Example',
          program: 'Programa Example',
          category: 'Noticias',
          broadcast_time: new Date().toISOString(),
          keywords: ['ejemplo', 'prueba']
        });

      if (dbError) throw dbError;

      setUploadProgress(100);
      
      toast.success("Archivo subido exitosamente", {
        description: file.size > 20 * 1024 * 1024 
          ? "El archivo será convertido a audio automáticamente."
          : "Listo para procesar la transcripción."
      });

      return { fileName, preview: URL.createObjectURL(file) };
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error("Error al subir el archivo", {
        description: error instanceof Error ? error.message : "Ocurrió un error al subir el archivo. Por favor, intenta nuevamente."
      });
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  return {
    isUploading,
    uploadProgress,
    uploadFile,
  };
};
