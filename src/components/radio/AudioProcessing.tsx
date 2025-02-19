
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

    // Validate file type
    if (!file.type.startsWith('audio/')) {
      throw new Error("Solo se permiten archivos de audio");
    }

    // Create a new File object from the uploaded file to ensure it's a valid File instance
    const validFile = new File([file], file.name, { type: file.type });
    console.log('Processing file:', {
      name: validFile.name,
      size: validFile.size,
      type: validFile.type
    });

    if (validFile.size > 25 * 1024 * 1024) {
      throw new Error("El tamaño del archivo excede el límite de 25MB");
    }

    // Create FormData and append file and user ID
    const formData = new FormData();
    formData.append('file', validFile); // Changed from 'audioFile' to 'file' to match Edge Function expectation
    formData.append('userId', user.id);

    console.log('Sending request to transcribe with formData:', {
      fileName: validFile.name,
      fileSize: validFile.size,
      userId: user.id
    });

    // Call Supabase Edge Function with proper headers
    const { data, error } = await supabase.functions.invoke('transcribe-audio', {
      body: formData,
      headers: {
        'Accept': 'application/json',
      },
    });

    if (error) {
      console.error('Transcription error:', error);
      throw new Error(error.message || "Error al procesar la transcripción");
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
  } catch (error: any) {
    console.error('Error processing file:', error);
    toast({
      title: "Error",
      description: error.message || "No se pudo procesar el archivo. Por favor, intenta nuevamente.",
      variant: "destructive",
    });
    throw error;
  }
};
