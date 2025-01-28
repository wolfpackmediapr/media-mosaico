import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { TranscriptionAnalysis } from "@/types/assemblyai";

interface UploadedFile extends File {
  preview?: string;
}

export const processAudioFile = async (
  file: UploadedFile,
  onTranscriptionComplete?: (
    text: string,
    metadata: {
      channel?: string;
      program?: string;
      category?: string;
      broadcastTime?: string;
      keywords?: string[];
      language?: string;
    },
    analysis: TranscriptionAnalysis
  ) => void
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

    const validFile = new File([file], file.name, { type: file.type });
    console.log('Processing file:', {
      name: validFile.name,
      size: validFile.size,
      type: validFile.type
    });

    if (validFile.size > 25 * 1024 * 1024) {
      throw new Error("El tamaño del archivo excede el límite de 25MB");
    }

    const formData = new FormData();
    formData.append('audioFile', validFile);
    formData.append('userId', user.id);

    console.log('Sending request to transcribe with formData:', {
      fileName: validFile.name,
      fileSize: validFile.size,
      userId: user.id
    });

    const { data, error } = await supabase.functions.invoke('transcribe-audio', {
      body: formData
    });

    if (error) {
      console.error('Transcription error:', error);
      throw new Error(error.message || "Error al procesar la transcripción");
    }

    console.log('Transcription response:', data);

    if (data?.text) {
      const metadata = {
        channel: data.channel,
        program: data.program,
        category: data.category,
        broadcastTime: data.broadcast_time,
        keywords: data.keywords,
        language: data.language
      };

      onTranscriptionComplete?.(data.text, metadata, data.analysis);
      
      toast({
        title: "Transcripción completada",
        description: `El archivo ha sido procesado exitosamente en ${data.language === 'es' ? 'español' : 'otro idioma'}`,
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