
import { toast } from "sonner";

export const validateAudioFile = (file: File): boolean => {
  // Check if file exists and has content
  if (!file || file.size === 0) {
    toast.error("El archivo está vacío o corrupto");
    return false;
  }

  // Check file size (max 25MB)
  const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB in bytes
  if (file.size > MAX_FILE_SIZE) {
    toast.error("El archivo excede el límite de 25MB");
    return false;
  }

  // Check file type
  const validTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a'];
  if (!validTypes.includes(file.type)) {
    toast.error("Formato no soportado. Por favor sube un archivo MP3, WAV, OGG o M4A");
    return false;
  }

  return true;
};
