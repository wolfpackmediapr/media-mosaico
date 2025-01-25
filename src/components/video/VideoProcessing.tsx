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

    // Create transcription record
    const { error: insertError } = await supabase
      .from('transcriptions')
      .insert({
        user_id: user.id,
        original_file_path: filePath,
        status: 'pending',
        progress: 0
      });

    if (insertError) {
      console.error('Insert error:', insertError);
      throw new Error('Error creating transcription record');
    }

    // Start conversion process
    console.log("Converting video to audio:", filePath);
    const { error: conversionError } = await supabase.functions.invoke('convert-to-audio', {
      body: { videoPath: filePath }
    });

    if (conversionError) {
      console.error('Conversion error:', conversionError);
      throw conversionError;
    }

    // Start transcription process
    console.log("Processing transcription:", filePath);
    const { data, error: transcriptionError } = await supabase.functions.invoke('transcribe-video', {
      body: { videoPath: filePath }
    });

    if (transcriptionError) {
      console.error('Transcription error:', transcriptionError);
      throw transcriptionError;
    }

    if (data?.text) {
      onTranscriptionComplete?.(data.text);
      toast({
        title: "Transcripción completada",
        description: "El archivo ha sido procesado exitosamente",
      });
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