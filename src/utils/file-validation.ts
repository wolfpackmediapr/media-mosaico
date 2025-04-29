
import { toast } from "sonner";

// Enhanced list of audio MIME types to support broader format compatibility
const AUDIO_MIME_TYPES = [
  'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a',
  'audio/aac', 'audio/flac', 'audio/x-m4a', 'audio/x-wav', 'audio/webm',
  'audio/wave', 'audio/x-pn-wav', 'audio/x-ms-wma', 'audio/mp4',
  'audio/x-aiff', 'audio/x-mpegurl', 'audio/x-matroska', 'audio/basic',
  'audio/vnd.wav', 'audio/opus', 'audio/', 'audio/x-', 'audio/vnd.'
];

// Enhanced list of valid file extensions with broader support
const AUDIO_EXTENSIONS = [
  '.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac', '.wma',
  '.webm', '.aiff', '.aif', '.aifc', '.m3u', '.pls', '.mka', '.opus',
  '.mp4', '.3gp', '.amr'
];

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
  
  const fileType = file.type.toLowerCase();
  const fileName = file.name.toLowerCase();
  
  // Enhanced MIME type detection
  const hasValidMimeType = AUDIO_MIME_TYPES.some(mime => 
    fileType.includes(mime) || 
    // Handle partial MIME types
    (fileType.startsWith('audio/') && !fileType.endsWith('/'))
  );
  
  const hasValidExtension = AUDIO_EXTENSIONS.some(ext => fileName.endsWith(ext));
  
  // Expanded validation logic
  
  // Case 1: Files with no MIME type but valid extension are considered valid
  // Common with files downloaded from certain sources
  if (!fileType && hasValidExtension) {
    console.log(`[FileValidation] File has no MIME type but has valid extension: ${fileName}`);
    return true;
  }
  
  // Case 2: Files with generic "application/octet-stream" but valid extension
  // Browsers sometimes use this generic MIME type
  if (fileType === 'application/octet-stream' && hasValidExtension) {
    console.log(`[FileValidation] File has generic MIME type but valid extension: ${fileName}`);
    return true;
  }
  
  // Case 3: Files with valid MIME type are obviously valid
  if (hasValidMimeType) {
    console.log(`[FileValidation] Valid audio file with MIME type: ${fileType}, name: ${fileName}`);
    return true;
  }
  
  // Case 4: Files with valid extension but unrecognized MIME
  // Some browsers/systems assign unusual MIME types
  if (hasValidExtension) {
    console.log(`[FileValidation] File has valid extension but unusual MIME type: ${fileType}, accepting: ${fileName}`);
    return true;
  }
  
  // If none of the above conditions are met, reject the file
  console.error(`[FileValidation] Invalid file format: ${fileType || 'unknown'}, name: ${fileName}`);
  toast.error("Formato no soportado. Por favor sube un archivo MP3, WAV, OGG, M4A, AAC o FLAC");
  return false;
};
