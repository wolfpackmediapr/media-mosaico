
import { toast } from "sonner";

// Enhanced list of audio MIME types to support broader format compatibility
const AUDIO_MIME_TYPES = [
  'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a',
  'audio/aac', 'audio/flac', 'audio/x-m4a', 'audio/x-wav', 'audio/webm',
  'audio/wave', 'audio/x-pn-wav', 'audio/x-ms-wma', 'audio/mp4',
  'audio/x-aiff', 'audio/x-mpegurl', 'audio/x-matroska', 'audio/basic',
  'audio/vnd.wav', 'audio/opus', 'audio/', 'audio/x-', 'audio/vnd.',
  // Adding more browser-specific MIME types
  'audio/mp3; codecs="mp3"', 'audio/wav; codecs="1"', 'application/octet-stream'
];

// Enhanced list of valid file extensions with broader support
const AUDIO_EXTENSIONS = [
  '.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac', '.wma',
  '.webm', '.aiff', '.aif', '.aifc', '.m3u', '.pls', '.mka', '.opus',
  '.mp4', '.3gp', '.amr'
];

// Global error cache for throttling across the app
class ErrorThrottler {
  private static errorCache = new Map<string, number>();
  private static ERROR_COOLDOWN = 5000; // 5 seconds minimum between similar errors

  static shouldShowError(errorKey: string): boolean {
    const now = Date.now();
    const lastShown = this.errorCache.get(errorKey) || 0;

    if (now - lastShown > this.ERROR_COOLDOWN) {
      this.errorCache.set(errorKey, now);
      return true;
    }
    return false;
  }

  static showThrottledError(message: string, errorKey = ''): void {
    const key = errorKey || message;
    if (this.shouldShowError(key)) {
      toast.error(message);
    } else {
      console.warn(`[FileValidation] Error message throttled: ${message}`);
    }
  }
}

export const validateAudioFile = (file: File): boolean => {
  // Check if file exists and has content
  if (!file || file.size === 0) {
    ErrorThrottler.showThrottledError("El archivo está vacío o corrupto", "empty-file");
    return false;
  }

  // Check file size (max 25MB)
  const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB in bytes
  if (file.size > MAX_FILE_SIZE) {
    ErrorThrottler.showThrottledError("El archivo excede el límite de 25MB", "file-too-large");
    return false;
  }
  
  const fileType = file.type.toLowerCase();
  const fileName = file.name.toLowerCase();
  
  // Log file details for debugging
  console.log(`[FileValidation] Validating file: ${fileName}, type: ${fileType}, size: ${file.size/1024/1024}MB`);
  
  // Check if file is reconstructed (has isReconstructed property)
  const isReconstructed = (file as any).isReconstructed === true;
  if (isReconstructed) {
    console.log(`[FileValidation] File is reconstructed from metadata: ${fileName}`);
    // Be more lenient with reconstructed files to avoid errors
    return true;
  }
  
  // Enhanced MIME type detection with safety
  const hasValidMimeType = AUDIO_MIME_TYPES.some(mime => {
    if (!mime || !fileType) return false;
    return fileType.includes(mime) || 
      // Handle partial MIME types with more precision
      (mime.endsWith('/') && fileType.startsWith(mime)) ||
      (mime.includes('octet-stream') && fileType.includes('octet-stream'));
  });
  
  // More robust extension validation
  const hasValidExtension = AUDIO_EXTENSIONS.some(ext => {
    if (!ext || !fileName) return false;
    return fileName.endsWith(ext);
  });
  
  // Expanded validation logic with better logging
  
  // Case 1: Files with no MIME type but valid extension are considered valid
  // Common with files downloaded from certain sources
  if (!fileType && hasValidExtension) {
    console.log(`[FileValidation] Accepted: File has no MIME type but has valid extension: ${fileName}`);
    return true;
  }
  
  // Case 2: Files with generic "application/octet-stream" but valid extension
  // Browsers sometimes use this generic MIME type
  if (fileType === 'application/octet-stream' && hasValidExtension) {
    console.log(`[FileValidation] Accepted: File has generic MIME type but valid extension: ${fileName}`);
    return true;
  }
  
  // Case 3: Files with valid MIME type are obviously valid
  if (hasValidMimeType) {
    console.log(`[FileValidation] Accepted: Valid audio file with MIME type: ${fileType}, name: ${fileName}`);
    return true;
  }
  
  // Case 4: Files with valid extension but unrecognized MIME
  // Some browsers/systems assign unusual MIME types
  if (hasValidExtension) {
    console.log(`[FileValidation] Accepted: File has valid extension but unusual MIME type: ${fileType}, name: ${fileName}`);
    return true;
  }

  // Case 5: Special case for potentially corrupted but salvageable files
  if ((fileType.includes('audio') || fileType.includes('video') || 
        fileType.includes('application/octet-stream')) && file.size > 1024) {
    console.log(`[FileValidation] Conditionally accepted: File has potentially valid MIME type: ${fileType}, name: ${fileName}`);
    return true;
  }
  
  // If none of the above conditions are met, reject the file
  console.error(`[FileValidation] Invalid file format: ${fileType || 'unknown'}, name: ${fileName}`);
  ErrorThrottler.showThrottledError("Formato no soportado. Por favor sube un archivo MP3, WAV, OGG, M4A, AAC o FLAC", "invalid-format");
  return false;
};

// Export the ErrorThrottler for use in other modules
export const { showThrottledError } = ErrorThrottler;
