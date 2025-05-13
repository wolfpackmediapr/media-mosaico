
/**
 * Gets details about an audio file format
 * @param file Audio file to inspect
 * @returns Format details and recommendations
 */
export const getAudioFormatDetails = (file: File): { 
  extension: string; 
  isSupported: boolean;
  recommendation: string | null;
} => {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  const mime = file.type.toLowerCase();
  
  // Default result
  const result = {
    extension,
    isSupported: true,
    recommendation: null
  };
  
  // Check if the browser can play this format
  const canPlay = canBrowserPlayFile(file);
  
  // Format-specific checks
  if (extension === 'mp3' || mime.includes('mp3')) {
    result.isSupported = true;
  } else if (extension === 'wav' || mime.includes('wav')) {
    result.isSupported = true;
    // WAV files can be large
    if (file.size > 10 * 1024 * 1024) {
      result.recommendation = 'Este archivo WAV es grande y puede afectar el rendimiento.';
    }
  } else if (extension === 'ogg' || mime.includes('ogg')) {
    // OGG support varies
    if (!canPlay) {
      result.isSupported = false;
      result.recommendation = 'Los archivos OGG no son compatibles con todos los navegadores.';
    }
  } else if (extension === 'aac' || mime.includes('aac')) {
    result.isSupported = true;
  } else if (extension === 'flac' || mime.includes('flac')) {
    result.isSupported = false;
    result.recommendation = 'Los archivos FLAC no son compatibles con todos los navegadores.';
  } else if (extension === 'm4a' || mime.includes('m4a')) {
    result.isSupported = true;
  } else {
    // Unknown format
    result.isSupported = false;
    result.recommendation = `El formato de audio ${extension || mime} puede no ser compatible.`;
  }
  
  // Override based on actual browser capability
  if (!canPlay && result.isSupported) {
    result.isSupported = false;
    result.recommendation = `Este navegador no puede reproducir archivos ${extension || mime}.`;
  }
  
  return result;
};

/**
 * Checks if the browser can play a specific audio file
 * @param file File to check
 * @returns Boolean indicating if the file can be played
 */
export const canBrowserPlayFile = (file: File): boolean => {
  const audio = document.createElement('audio');
  
  // Get file extension and type
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  const mime = file.type;
  
  // Check based on MIME type
  if (mime && mime.includes('audio/')) {
    return audio.canPlayType(mime) !== '';
  }
  
  // Check based on extension
  switch(extension) {
    case 'mp3':
      return audio.canPlayType('audio/mpeg') !== '';
    case 'wav':
      return audio.canPlayType('audio/wav') !== '';
    case 'ogg':
      return audio.canPlayType('audio/ogg') !== '';
    case 'aac':
      return audio.canPlayType('audio/aac') !== '';
    case 'flac':
      return audio.canPlayType('audio/flac') !== '';
    case 'm4a':
      return audio.canPlayType('audio/mp4') !== '';
    default:
      return false;
  }
};
