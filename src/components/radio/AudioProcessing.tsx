import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface UploadedFile extends File {
  preview?: string;
}

export const processAudioFile = async (
  file: UploadedFile,
  onTranscriptionComplete?: (text: string) => void
) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Error",
        description: "Debes iniciar sesión para procesar transcripciones",
        variant: "destructive",
      });
      return;
    }

    if (!file || !(file instanceof File)) {
      console.error('Invalid file object:', file);
      throw new Error("Archivo inválido");
    }

    console.log('Processing file:', {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    });

    if (file.size > 25 * 1024 * 1024) {
      throw new Error("El tamaño del archivo excede el límite de 25MB");
    }

    // Create FormData and append file with specific name
    const formData = new FormData();
    formData.append('audioFile', file, file.name);
    formData.append('userId', user.id);

    console.log('Sending request to transcribe with formData:', {
      fileName: file.name,
      fileSize: file.size,
      userId: user.id
    });

    const { data, error } = await supabase.functions.invoke('transcribe-audio', {
      body: formData,
    });

    if (error) {
      console.error('Transcription error:', error);
      throw new Error(error.message);
    }

    console.log('Transcription response:', data);

    if (data?.text) {
      onTranscriptionComplete?.(data.text);
      toast({
        title: "Transcripción completada",
        description: "El archivo ha sido procesado exitosamente",
      });
    } else {
      throw new Error("No se recibió texto de transcripción");
    }
  } catch (error) {
    console.error('Error processing file:', error);
    toast({
      title: "Error",
      description: error.message || "No se pudo procesar el archivo. Por favor, intenta nuevamente.",
      variant: "destructive",
    });
    throw error;
  }
};