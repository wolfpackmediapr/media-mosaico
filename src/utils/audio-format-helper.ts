
/**
 * Utility functions for audio format detection and compatibility
 */

// Check if the browser can play a specific audio format
export const canPlayType = (type: string): boolean => {
  const audio = document.createElement('audio');
  
  // Map common file extensions to MIME types
  const mimeTypes: Record<string, string> = {
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'ogg': 'audio/ogg',
    'aac': 'audio/aac',
    'm4a': 'audio/mp4',
    'flac': 'audio/flac',
    'webm': 'audio/webm'
  };
  
  // Get the MIME type from the extension
  const mimeType = mimeTypes[type.toLowerCase()] || type;
  
  // Check if the browser can play this type
  const canPlay = audio.canPlayType(mimeType);
  return canPlay === 'probably' || canPlay === 'maybe';
};

// Get a list of audio formats supported by the current browser
export const getSupportedFormats = (): string[] => {
  const formats = ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'webm'];
  return formats.filter(format => canPlayType(format));
};

// Determine if the file is likely to be playable in the current browser
export const isLikelyPlayable = (file: File): boolean => {
  // Extract extension from filename
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  
  // Check if file has a MIME type that's supported
  const supportedFormats = getSupportedFormats();
  const hasSupportedExtension = supportedFormats.includes(extension);
  
  // Check if the file's MIME type is supported
  const hasSupportedMimeType = supportedFormats.some(format => {
    const mimePattern = new RegExp(`audio/${format}|audio/x-${format}`);
    return mimePattern.test(file.type);
  });
  
  return hasSupportedExtension || hasSupportedMimeType;
};

// Format duration for display
export const formatAudioDuration = (durationSecs: number): string => {
  if (!durationSecs) return '0:00';
  
  const minutes = Math.floor(durationSecs / 60);
  const seconds = Math.floor(durationSecs % 60);
  
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};
