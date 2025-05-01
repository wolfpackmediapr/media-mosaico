
/**
 * Utility functions for file validation
 */

// List of common audio MIME types
const AUDIO_MIME_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/wave',
  'audio/x-wav',
  'audio/ogg',
  'audio/vorbis',
  'audio/flac',
  'audio/x-flac',
  'audio/aac',
  'audio/mp4',
  'audio/x-m4a',
  'audio/webm',
  'audio/x-pn-wav',
  'audio/x-ms-wma'
];

// Audio file extensions that are supported
const AUDIO_FILE_EXTENSIONS = [
  '.mp3',
  '.wav',
  '.ogg',
  '.flac',
  '.m4a',
  '.aac',
  '.webm',
  '.wma'
];

/**
 * Validates if a file is an audio file based on MIME type and extension
 */
export const validateAudioFile = (file: File): boolean => {
  if (!file) return false;
  
  // Check MIME type
  const mimeTypeValid = AUDIO_MIME_TYPES.some(type => 
    file.type === type || file.type.startsWith(type.split('/')[0])
  );
  
  // If the MIME type looks valid, that's enough
  if (mimeTypeValid) return true;
  
  // If MIME type is empty or unknown, check by file extension
  const fileName = file.name.toLowerCase();
  const hasValidExtension = AUDIO_FILE_EXTENSIONS.some(ext => 
    fileName.endsWith(ext)
  );
  
  return hasValidExtension;
};

/**
 * Get file extension from File object
 */
export const getFileExtension = (file: File): string => {
  return file.name.split('.').pop()?.toLowerCase() || '';
};

/**
 * Check if file size is within acceptable limits
 * @param file The file to check
 * @param maxSizeMB Maximum size in megabytes
 */
export const isFileSizeValid = (file: File, maxSizeMB: number = 50): boolean => {
  const fileSizeMB = file.size / (1024 * 1024);
  return fileSizeMB <= maxSizeMB;
};
