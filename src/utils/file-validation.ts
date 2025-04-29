
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
  // Expanded list of audio MIME types
  const validTypes = [
    'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a',
    'audio/aac', 'audio/flac', 'audio/x-m4a', 'audio/x-wav', 'audio/webm',
    'audio/wave', 'audio/x-pn-wav', 'audio/x-ms-wma', 'audio/mp4'
  ];
  
  // Some files might have generic mime types
  const validExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac', '.wma'];
  
  const hasValidMimeType = validTypes.includes(file.type);
  const hasValidExtension = validExtensions.some(ext => 
    file.name.toLowerCase().endsWith(ext)
  );
  
  // If file has no MIME type but has valid extension, consider it valid
  if (!file.type && hasValidExtension) {
    console.log(`[FileValidation] File has no MIME type but has valid extension: ${file.name}`);
    return true;
  }
  
  // If file has neither valid MIME nor extension, reject it
  if (!hasValidMimeType && !hasValidExtension) {
    console.error(`[FileValidation] Invalid file format: ${file.type || 'unknown'}, name: ${file.name}`);
    toast.error("Formato no soportado. Por favor sube un archivo MP3, WAV, OGG, M4A, AAC o FLAC");
    return false;
  }

  console.log(`[FileValidation] Valid audio file: ${file.name}, type: ${file.type || 'none'}`);
  return true;
};
