
/**
 * Utility functions for validating files
 */

import { toast } from "sonner";

// Audio file MIME type validation
const VALID_AUDIO_MIME_TYPES = [
  'audio/mpeg', 
  'audio/mp3',
  'audio/wav', 
  'audio/wave',
  'audio/x-wav',
  'audio/webm',
  'audio/ogg',
  'audio/x-m4a',
  'audio/mp4',
  'audio/aac',
  'audio/flac',
  'audio/x-flac'
];

// Audio file extension validation
const VALID_AUDIO_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac', '.webm'];

/**
 * Validates if a file is a supported audio format
 */
export const validateAudioFile = (file: File, maxSizeMB: number = 200): boolean => {
  // Check file type
  const isValidMimeType = VALID_AUDIO_MIME_TYPES.some(type => file.type === type);
  
  // Check file extension as fallback if MIME type is not recognized
  const fileName = file.name.toLowerCase();
  const hasValidExtension = VALID_AUDIO_EXTENSIONS.some(ext => fileName.endsWith(ext));
  
  // Check file size
  const isValidSize = file.size <= maxSizeMB * 1024 * 1024;

  if (!isValidMimeType && !hasValidExtension) {
    toast.error("Tipo de archivo inválido", {
      description: "El formato de audio no es compatible"
    });
    return false;
  }
  
  if (!isValidSize) {
    toast.error("Archivo demasiado grande", {
      description: `El tamaño máximo permitido es ${maxSizeMB}MB`
    });
    return false;
  }
  
  return true;
};

/**
 * Helper to get detailed format information for debugging
 */
export const getAudioFormatDetails = (file: File): string => {
  const fileName = file.name;
  const extension = fileName.split('.').pop()?.toLowerCase() || 'unknown';
  const mimeType = file.type || 'unknown';
  const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
  
  return `Format: ${extension}, MIME: ${mimeType}, Size: ${fileSizeMB}MB`;
};
