
/**
 * Audio format detection utilities
 * Provides functions for audio format identification and MIME type handling
 */

/**
 * Gets MIME type from a file based on extension or existing type
 * @param file The file to check
 * @returns MIME type string
 */
export const getMimeTypeFromFile = (file: File): string => {
  if (file.type) return file.type;
  
  // Try to infer type from extension
  const ext = file.name.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'mp3': return 'audio/mpeg';
    case 'wav': return 'audio/wav';
    case 'ogg': return 'audio/ogg';
    case 'm4a': return 'audio/mp4';
    case 'aac': return 'audio/aac';
    case 'flac': return 'audio/flac';
    default: return 'audio/mpeg'; // Default to mp3 if unknown
  }
};

/**
 * Gets detailed information about an audio file format including browser support
 * @param file Audio file to check
 * @returns Object containing format details, support information, and recommendations
 */
export const getAudioFormatDetails = (file: File): {
  extension: string;
  mimeType: string;
  isSupported: boolean;
  recommendation: string | null;
} => {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const mimeType = getMimeTypeFromFile(file);
  const audio = document.createElement('audio');
  const canPlay = audio.canPlayType(mimeType);
  
  // Check browser support
  const isSupported = canPlay !== '';
  
  // Generate recommendations based on format
  let recommendation = null;
  if (!isSupported) {
    recommendation = `This audio format (${ext}) has limited browser support. Consider converting to MP3 for better compatibility.`;
  } else if (canPlay === 'maybe') {
    if (ext === 'flac' || ext === 'wav') {
      recommendation = `${ext.toUpperCase()} files are large. Consider using MP3 for better streaming performance.`;
    }
  }
  
  return {
    extension: ext,
    mimeType,
    isSupported,
    recommendation
  };
};

/**
 * Check if the audio format is supported on this browser
 * @param format Audio format extension (mp3, wav, etc)
 * @returns boolean indicating support
 */
export const isFormatSupported = (format: string): boolean => {
  const audio = document.createElement('audio');
  
  // Map extensions to MIME types
  const mimeTypes: Record<string, string> = {
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
    m4a: 'audio/mp4',
    aac: 'audio/aac',
    flac: 'audio/flac'
  };
  
  const mimeType = mimeTypes[format.toLowerCase()] || `audio/${format.toLowerCase()}`;
  return audio.canPlayType(mimeType) !== '';
};
