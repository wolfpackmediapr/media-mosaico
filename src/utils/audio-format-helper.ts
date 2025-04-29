
/**
 * Utility functions for audio format detection and compatibility
 */

// Check if the browser can play a specific audio format with enhanced detection
export const canPlayType = (type: string): boolean => {
  const audio = document.createElement('audio');
  
  // Map common file extensions to MIME types with fallbacks
  const mimeTypes: Record<string, string[]> = {
    'mp3': ['audio/mpeg', 'audio/mp3'],
    'wav': ['audio/wav', 'audio/wave', 'audio/x-wav', 'audio/vnd.wave'],
    'ogg': ['audio/ogg', 'video/ogg', 'application/ogg'],
    'aac': ['audio/aac', 'audio/x-aac', 'audio/aacp'],
    'm4a': ['audio/mp4', 'audio/x-m4a', 'audio/m4a'],
    'flac': ['audio/flac', 'audio/x-flac'],
    'webm': ['audio/webm', 'video/webm'],
    'mp4': ['audio/mp4', 'video/mp4']
  };
  
  try {
    // Get the MIME types for the extension
    const extension = type.toLowerCase().replace('.', '');
    const mimesToTry = mimeTypes[extension] || [type];
    
    // Try each possible MIME type
    for (const mimeType of mimesToTry) {
      const canPlay = audio.canPlayType(mimeType);
      if (canPlay === 'probably' || canPlay === 'maybe') {
        return true;
      }
    }
    
    // If we have an extension but no direct match, try it directly with audio/ prefix
    if (extension && !extension.includes('/') && !mimesToTry.includes(`audio/${extension}`)) {
      const canPlay = audio.canPlayType(`audio/${extension}`);
      return canPlay === 'probably' || canPlay === 'maybe';
    }
    
    return false;
  } catch (e) {
    console.warn(`[canPlayType] Error checking format compatibility: ${e}`);
    // Fall back to a conservative assumption
    return mimeTypes[type.toLowerCase()] !== undefined;
  }
};

// Get a list of audio formats supported by the current browser
export const getSupportedFormats = (): string[] => {
  const formats = ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'webm', 'mp4'];
  return formats.filter(format => canPlayType(format));
};

// Enhanced detection for playable files
export const isLikelyPlayable = (file: File): boolean => {
  try {
    // Extract extension from filename
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    
    // Get supported formats
    const supportedFormats = getSupportedFormats();
    
    // Check extension directly
    if (extension && supportedFormats.includes(extension)) {
      return true;
    }
    
    // Check MIME type patterns more thoroughly
    const hasSupportedMimeType = supportedFormats.some(format => {
      // Check for direct matches and variations
      const mimePatterns = [
        `audio/${format}`,
        `audio/x-${format}`,
        `audio/vnd.${format}`
      ];
      return mimePatterns.some(pattern => file.type.includes(pattern));
    });
    
    // General audio/* type check as fallback
    const isGenericAudio = file.type.startsWith('audio/');
    
    return hasSupportedMimeType || isGenericAudio;
  } catch (e) {
    console.warn(`[isLikelyPlayable] Error checking playability: ${e}`);
    // Fall back to extension-only check
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    return ['mp3', 'wav', 'ogg', 'm4a', 'aac'].includes(extension);
  }
};

// Format duration for display
export const formatAudioDuration = (durationSecs: number): string => {
  if (!durationSecs || isNaN(durationSecs)) return '0:00';
  
  const minutes = Math.floor(durationSecs / 60);
  const seconds = Math.floor(durationSecs % 60);
  
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};
