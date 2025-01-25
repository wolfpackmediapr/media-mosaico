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

    // First, upload the file to storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;

    console.log("Uploading file to storage:", filePath);
    
    const { error: uploadError } = await supabase.storage
      .from('media')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error('Error uploading file to storage');
    }

    if (file.size <= 25 * 1024 * 1024) {
      console.log("Processing file:", filePath);
      
      const { data, error } = await supabase.functions.invoke('transcribe-video', {
        body: { videoPath: filePath }
      });

      if (error) {
        console.error('Transcription error:', error);
        throw error;
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