import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB in bytes

const sanitizeFileName = (fileName: string) => {
  // Remove special characters and spaces, replace with underscores
  const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'));
  const ext = fileName.substring(fileName.lastIndexOf('.'));
  const sanitized = nameWithoutExt.replace(/[^\w\-]/g, '_');
  return sanitized + ext;
};

export const useFileUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const uploadFile = async (file: File) => {
    const validTypes = ['audio/mpeg', 'audio/wav', 'audio/x-m4a', 'audio/mp3'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Error",
        description: "Por favor, sube únicamente archivos de audio (MP3, WAV, M4A).",
        variant: "destructive",
      });
      return null;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: "Archivo demasiado grande",
        description: "El archivo excede el límite de 25MB",
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

    const sanitizedFileName = sanitizeFileName(file.name);
    const fileName = `${user.id}/${Date.now()}_${sanitizedFileName}`;

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
          status: 'pending',
          channel: 'Radio Example',
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
        description: "Listo para procesar la transcripción.",
      });

      return { fileName, preview: URL.createObjectURL(file) };
    } catch (error) {
      console.error('Error uploading file:', error);
      setIsUploading(false);
      toast({
        title: "Error al subir el archivo",
        description: "No se pudo subir el archivo. Por favor, intenta nuevamente.",
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