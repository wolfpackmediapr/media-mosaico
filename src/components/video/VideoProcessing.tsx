import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface UploadedFile extends File {
  preview?: string;
}

export const processVideoFile = async (
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

    if (file.size <= 25 * 1024 * 1024) {
      // For files under 25MB, use direct transcription
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', user.id);

      const { data, error } = await supabase.functions.invoke('secure-transcribe', {
        body: formData,
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.text) {
        onTranscriptionComplete?.(data.text);
        toast({
          title: "Transcripción completada",
          description: "El archivo ha sido procesado exitosamente",
        });
      }
    } else {
      throw new Error("File size exceeds 25MB limit");
    }
  } catch (error) {
    console.error('Error processing file:', error);
    toast({
      title: "Error",
      description: "No se pudo procesar el archivo. Por favor, intenta nuevamente.",
      variant: "destructive",
    });
  }
};