
// File validation utilities

/**
 * Check if a file is a valid audio file
 */
export const validateAudioFile = (file: File): boolean => {
  if (!file) {
    return false;
  }

  // Common audio MIME types
  const validAudioMimeTypes = [
    'audio/',          // Any audio type
    'video/mp4',       // Sometimes .m4a files are misclassified as video/mp4
    'application/octet-stream' // Generic binary type, might be audio
  ];
  
  // Valid audio extensions
  const validExtensions = ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'webm', 'mp4'];
  
  // Check MIME type
  const hasValidMimeType = validAudioMimeTypes.some(mimeType => 
    file.type.includes(mimeType)
  );
  
  // Check file extension
  const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
  const hasValidExtension = validExtensions.includes(fileExtension);
  
  // Accept if either MIME type or extension is valid
  return hasValidMimeType || hasValidExtension;
};

/**
 * Extract audio format details for better diagnostics
 */
export const getAudioFormatDetails = (file: File): string => {
  if (!file) return 'No file provided';
  
  const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'unknown';
  return `Name: ${file.name}, Type: ${file.type}, Size: ${(file.size / 1024).toFixed(1)}KB, Extension: ${fileExtension}`;
};
