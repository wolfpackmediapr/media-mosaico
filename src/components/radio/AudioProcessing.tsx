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

    if (file.size <= 25 * 1024 * 1024) {
      // Create a proper FormData object
      const formData = new FormData();
      
      // Important: The file needs to be added as a Blob with the correct type
      const blob = new Blob([file], { type: file.type });
      formData.append('file', blob, file.name);
      formData.append('userId', user.id);

      console.log('Sending file to transcribe:', {
        name: file.name,
        size: file.size,
        type: file.type
      });

      const { data, error } = await supabase.functions.invoke('transcribe-audio', {
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (error) {
        console.error('Transcription error:', error);
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
      throw new Error("El tamaño del archivo excede el límite de 25MB");
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