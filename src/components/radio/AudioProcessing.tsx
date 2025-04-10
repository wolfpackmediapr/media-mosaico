
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface UploadedFile extends File {
  preview?: string;
}

export const processAudioFile = async (
  file: UploadedFile,
  onTranscriptionComplete?: (text: string) => void
) => {
  try {
    // Check authentication first
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('Authentication error:', authError);
      throw new Error("Error verificando la autenticación: " + authError.message);
    }
    
    if (!user) {
      console.log('User not authenticated, redirecting to login');
      toast({
        title: "Autenticación requerida",
        description: "Debes iniciar sesión para procesar transcripciones. Serás redirigido a la página de login.",
        variant: "destructive",
      });
      
      // We'll handle the redirect in the component that calls this function
      throw new Error("AUTH_REQUIRED");
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
      type: validFile.type,
      userId: user.id
    });

    if (validFile.size > 25 * 1024 * 1024) {
      throw new Error("El tamaño del archivo excede el límite de 25MB");
    }

    // Create FormData and append file and user ID
    const formData = new FormData();
    formData.append('file', validFile);
    formData.append('userId', user.id);

    console.log('Sending request to transcribe with formData:', {
      fileName: validFile.name,
      fileSize: validFile.size,
      userId: user.id
    });

    // First try AssemblyAI through our edge function
    try {
      console.log('Attempting transcription with AssemblyAI...');
      const { data, error } = await supabase.functions.invoke('transcribe-audio', {
        body: formData,
        headers: {
          'Accept': 'application/json',
        },
      });

      if (error) {
        console.error('AssemblyAI transcription error:', error);
        throw new Error(error.message || "Error with AssemblyAI transcription");
      }

      if (data?.text) {
        console.log('AssemblyAI transcription successful');
        onTranscriptionComplete?.(data.text);
        toast({
          title: "Transcripción completada",
          description: "El archivo ha sido procesado exitosamente con AssemblyAI",
        });
        return;
      }
      
      console.warn('No text received from AssemblyAI, falling back to OpenAI');
    } catch (assemblyError) {
      console.error('AssemblyAI transcription failed, falling back to OpenAI:', assemblyError);
    }

    // Fallback to OpenAI Whisper
    try {
      console.log('Attempting transcription with OpenAI Whisper...');
      const { data, error } = await supabase.functions.invoke('secure-transcribe', {
        body: formData,
        headers: {
          'Accept': 'application/json',
        },
      });

      if (error) {
        console.error('OpenAI transcription error:', error);
        throw new Error(error.message || "Error al procesar la transcripción con OpenAI");
      }

      if (data?.text) {
        console.log('OpenAI transcription successful');
        onTranscriptionComplete?.(data.text);
        toast({
          title: "Transcripción completada",
          description: "El archivo ha sido procesado exitosamente con OpenAI Whisper",
        });
        return;
      }
      
      throw new Error("No se recibió texto de transcripción de ningún proveedor");
    } catch (openaiError) {
      console.error('OpenAI transcription failed:', openaiError);
      throw openaiError;
    }
  } catch (error: any) {
    console.error('Error processing file:', error);
    
    // Special handling for authentication errors
    if (error.message === "AUTH_REQUIRED") {
      // This will be handled by the component
      throw error;
    }
    
    toast({
      title: "Error",
      description: error.message || "No se pudo procesar el archivo. Por favor, intenta nuevamente.",
      variant: "destructive",
    });
    throw error;
  }
};

// Helper function to handle auth redirection from components
export const useAudioProcessingWithAuth = () => {
  const navigate = useNavigate();
  
  const processWithAuth = async (
    file: UploadedFile,
    onTranscriptionComplete?: (text: string) => void
  ) => {
    try {
      await processAudioFile(file, onTranscriptionComplete);
      return true;
    } catch (error: any) {
      if (error.message === "AUTH_REQUIRED") {
        // Store the current path to return after login
        sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
        navigate('/auth');
        return false;
      }
      // Let other errors bubble up
      throw error;
    }
  };
  
  return processWithAuth;
};
