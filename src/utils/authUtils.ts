
import { supabase } from "@/integrations/supabase/client";

/**
 * Verify if a user is authenticated
 * @returns The authenticated user or throws an error
 */
export const verifyAuthentication = async () => {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError) {
    console.error('Authentication error:', authError);
    throw new Error("Error verificando la autenticación: " + authError.message);
  }
  
  if (!user) {
    console.log('User not authenticated');
    throw new Error("AUTH_REQUIRED");
  }
  
  return user;
};

/**
 * Validate an audio file
 * @param file File to validate
 * @returns A validated File object or throws an error
 */
export const validateAudioFile = (file: File): File => {
  if (!file.type.startsWith('audio/')) {
    throw new Error("Solo se permiten archivos de audio");
  }

  // Create a new File object from the uploaded file to ensure it's a valid File instance
  const validFile = new File([file], file.name, { type: file.type });
  
  if (validFile.size > 25 * 1024 * 1024) {
    throw new Error("El tamaño del archivo excede el límite de 25MB");
  }
  
  return validFile;
};
