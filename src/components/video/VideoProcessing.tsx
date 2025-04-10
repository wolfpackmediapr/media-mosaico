
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { createNotification } from "@/services/notifications/notificationService";

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
      
      try {
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

          try {
            console.log('Attempting transcription with transcribe-video function...');
            const { data: transcriptionData, error: transcriptionError } = await supabase.functions.invoke('transcribe-video', {
              body: { videoPath: data.audioPath }
            });

            if (transcriptionError) {
              console.error('Primary transcription error:', transcriptionError);
              throw new Error(`Transcription error: ${transcriptionError.message}`);
            }

            if (transcriptionData?.text) {
              onTranscriptionComplete?.(transcriptionData.text);
              toast({
                title: "Transcripción completada",
                description: "El archivo ha sido procesado exitosamente",
              });
              
              // Create notification for the transcription completion
              await createNotification({
                client_id: user.id,
                title: "Nueva transcripción completada",
                description: `Transcripción de archivo ${file.name} completada exitosamente`,
                content_type: "tv",
                importance_level: 3,
                metadata: {
                  fileName: file.name,
                  fileType: file.type,
                  transcriptionLength: transcriptionData.text.length
                }
              });
              return;
            } else {
              throw new Error('No transcription text received');
            }
          } catch (transcribeError) {
            console.error('Transcription failed, trying fallback method:', transcribeError);
            
            // Fallback to analyze-content
            try {
              const { data: analyzeData, error: analyzeError } = await supabase.functions.invoke('analyze-content', {
                body: { videoPath: data.audioPath }
              });
              
              if (analyzeError) {
                console.error('Fallback analysis error:', analyzeError);
                throw analyzeError;
              }
              
              if (analyzeData?.text) {
                onTranscriptionComplete?.(analyzeData.text);
                toast({
                  title: "Transcripción completada (método alternativo)",
                  description: "El archivo ha sido procesado con un método alternativo",
                });
                return;
              }
              
              throw new Error('No transcription text received from fallback method');
            } catch (fallbackError) {
              console.error('All transcription methods failed:', fallbackError);
              throw new Error('No se pudo transcribir el archivo con ningún método disponible');
            }
          }
        }
      } catch (error) {
        console.error('Error processing MOV file:', error);
        throw error;
      }
    } 
    // For large non-MOV files, convert to audio first
    else if (file.size > 20 * 1024 * 1024) {
      console.log("File is larger than 20MB, converting to audio first");
      
      toast({
        title: "Procesando video",
        description: "El archivo es grande, se está convirtiendo a audio primero...",
      });
      
      try {
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

          try {
            const { data: transcriptionData, error: transcriptionError } = await supabase.functions.invoke('transcribe-video', {
              body: { videoPath: data.audioPath }
            });

            if (transcriptionError) {
              console.error('Primary transcription error:', transcriptionError);
              throw transcriptionError;
            }

            if (transcriptionData?.text) {
              onTranscriptionComplete?.(transcriptionData.text);
              toast({
                title: "Transcripción completada",
                description: "El archivo ha sido procesado exitosamente",
              });
              
              // Create notification for the transcription completion
              await createNotification({
                client_id: user.id,
                title: "Nueva transcripción completada",
                description: `Transcripción de archivo ${file.name} completada exitosamente`,
                content_type: "tv",
                importance_level: 3,
                metadata: {
                  fileName: file.name,
                  fileType: file.type,
                  transcriptionLength: transcriptionData.text.length
                }
              });
              return;
            } else {
              throw new Error('No transcription text received');
            }
          } catch (error) {
            console.error('All transcription methods failed:', error);
            throw new Error('No se pudo transcribir el archivo con ningún método disponible');
          }
        }
      } catch (error) {
        console.error('Error in conversion process:', error);
        throw error;
      }
    } 
    // For smaller, non-MOV files, process directly
    else {
      try {
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
          
          // Create notification for the transcription completion
          await createNotification({
            client_id: user.id,
            title: "Nueva transcripción completada",
            description: `Transcripción de archivo ${file.name} completada exitosamente`,
            content_type: "tv",
            importance_level: 3,
            metadata: {
              fileName: file.name,
              fileType: file.type,
              transcriptionLength: data.text.length
            }
          });
          return;
        } else {
          throw new Error('No transcription text received');
        }
      } catch (primaryError) {
        console.error('Primary transcription method failed:', primaryError);
        
        // Try fallback transcription method
        try {
          console.log('Trying fallback transcription method...');
          const { data: fallbackData, error: fallbackError } = await supabase.functions.invoke('secure-transcribe', {
            body: { 
              videoPath: filePath,
              userId: user.id
            }
          });
          
          if (fallbackError) {
            console.error('Fallback transcription error:', fallbackError);
            throw fallbackError;
          }
          
          if (fallbackData?.text) {
            onTranscriptionComplete?.(fallbackData.text);
            toast({
              title: "Transcripción completada (método alternativo)",
              description: "El archivo ha sido procesado con un método alternativo",
            });
            return;
          }
          
          throw new Error('No transcription text received from fallback method');
        } catch (fallbackError) {
          console.error('All transcription methods failed:', fallbackError);
          throw new Error('No se pudo transcribir el archivo con ningún método disponible');
        }
      }
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
