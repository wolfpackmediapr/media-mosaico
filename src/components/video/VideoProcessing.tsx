
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

    // First, check if the file is already uploaded
    const { data: transcription, error: transcriptionError } = await supabase
      .from('transcriptions')
      .select('original_file_path, id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (transcriptionError) {
      console.error('Error getting transcription:', transcriptionError);
      throw new Error('Error getting transcription information');
    }

    const filePath = transcription?.original_file_path;
    if (!filePath) {
      throw new Error('No file path found for transcription');
    }

    console.log("Processing file:", filePath, "File type:", file.type);
    
    // Always convert .mov files to mp4/mp3 first, regardless of size
    if (file.type === 'video/quicktime' || filePath.toLowerCase().endsWith('.mov')) {
      console.log("Detected .mov file, converting to audio first");
      
      toast({
        title: "Procesando video MOV",
        description: "Convirtiendo el archivo MOV a un formato compatible...",
      });
      
      const { data, error } = await supabase.functions.invoke('convert-to-audio', {
        body: { 
          videoPath: filePath,
          transcriptionId: transcription.id 
        }
      });

      if (error) {
        console.error('Conversion error:', error);
        throw error;
      }

      if (data?.audioPath) {
        toast({
          title: "Conversión completada",
          description: "Iniciando transcripción del audio...",
        });

        const { data: transcriptionData, error: transcriptionError } = await supabase.functions.invoke('transcribe-video', {
          body: { videoPath: data.audioPath }
        });

        if (transcriptionError) {
          console.error('Transcription error:', transcriptionError);
          throw transcriptionError;
        }

        if (transcriptionData?.text) {
          onTranscriptionComplete?.(transcriptionData.text);
          toast({
            title: "Transcripción completada",
            description: "El archivo ha sido procesado exitosamente",
          });
        }
      }
    } 
    // For large non-MOV files, convert to audio first
    else if (file.size > 20 * 1024 * 1024) {
      console.log("File is larger than 20MB, converting to audio first");
      
      toast({
        title: "Procesando video",
        description: "El archivo es grande, se está convirtiendo a audio primero...",
      });
      
      const { data, error } = await supabase.functions.invoke('convert-to-audio', {
        body: { 
          videoPath: filePath,
          transcriptionId: transcription.id
        }
      });

      if (error) {
        console.error('Conversion error:', error);
        throw error;
      }

      if (data?.audioPath) {
        toast({
          title: "Conversión completada",
          description: "Iniciando transcripción del audio...",
        });

        const { data: transcriptionData, error: transcriptionError } = await supabase.functions.invoke('transcribe-video', {
          body: { videoPath: data.audioPath }
        });

        if (transcriptionError) {
          console.error('Transcription error:', transcriptionError);
          throw transcriptionError;
        }

        if (transcriptionData?.text) {
          onTranscriptionComplete?.(transcriptionData.text);
          toast({
            title: "Transcripción completada",
            description: "El archivo ha sido procesado exitosamente",
          });
        }
      }
    } 
    // For smaller, non-MOV files, process directly
    else {
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
