
/**
 * Utility functions for audio format detection and compatibility
 */

// Cache format compatibility results to avoid repeated DOM operations
const compatibilityCache: Record<string, boolean> = {};

// Check if the browser can play a specific audio format with enhanced detection
export const canPlayType = (type: string): boolean => {
  // Check cache first
  const cacheKey = type.toLowerCase();
  if (compatibilityCache[cacheKey] !== undefined) {
    return compatibilityCache[cacheKey];
  }
  
  try {
    const audio = document.createElement('audio');
    
    // Map common file extensions to MIME types with fallbacks
    const mimeTypes: Record<string, string[]> = {
      'mp3': ['audio/mpeg', 'audio/mp3', 'audio/mpeg; codecs="mp3"'],
      'wav': ['audio/wav', 'audio/wave', 'audio/x-wav', 'audio/vnd.wave', 'audio/wav; codecs="1"'],
      'ogg': ['audio/ogg', 'video/ogg', 'application/ogg', 'audio/ogg; codecs="vorbis"'],
      'aac': ['audio/aac', 'audio/x-aac', 'audio/aacp', 'audio/mp4; codecs="aac"'],
      'm4a': ['audio/mp4', 'audio/x-m4a', 'audio/m4a', 'audio/mp4; codecs="mp4a.40.2"'],
      'flac': ['audio/flac', 'audio/x-flac', 'audio/ogg; codecs="flac"'],
      'webm': ['audio/webm', 'video/webm', 'audio/webm; codecs="vorbis"'],
      'mp4': ['audio/mp4', 'video/mp4', 'audio/mp4; codecs="mp4a.40.2"']
    };
    
    // Get the MIME types for the extension
    const extension = type.toLowerCase().replace('.', '');
    const mimesToTry = mimeTypes[extension] || [type];
    
    // Try each possible MIME type
    for (const mimeType of mimesToTry) {
      const canPlay = audio.canPlayType(mimeType);
      if (canPlay === 'probably' || canPlay === 'maybe') {
        // Store in cache and return
        compatibilityCache[cacheKey] = true;
        return true;
      }
    }
    
    // If we have an extension but no direct match, try it directly with audio/ prefix
    if (extension && !extension.includes('/') && !mimesToTry.includes(`audio/${extension}`)) {
      const canPlay = audio.canPlayType(`audio/${extension}`);
      const result = canPlay === 'probably' || canPlay === 'maybe';
      compatibilityCache[cacheKey] = result;
      return result;
    }
    
    // Cache negative result and return
    compatibilityCache[cacheKey] = false;
    return false;
  } catch (e) {
    console.warn(`[canPlayType] Error checking format compatibility: ${e}`);
    // Fall back to a conservative assumption - assuming MP3 and WAV always work
    const isMp3OrWav = type.toLowerCase().includes('mp3') || type.toLowerCase().includes('wav');
    compatibilityCache[cacheKey] = isMp3OrWav;
    return isMp3OrWav;
  }
};

// Get a list of audio formats supported by the current browser
export const getSupportedFormats = (): string[] => {
  const formats = ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'webm', 'mp4'];
  const supported = formats.filter(format => canPlayType(format));
  // Always include mp3 as supported since almost all browsers support it
  // even if detection fails for some reason
  if (supported.length === 0 || !supported.includes('mp3')) {
    supported.push('mp3');
  }
  return supported;
};

// Enhanced detection for playable files
export const isLikelyPlayable = (file: File): boolean => {
  try {
    // Extract extension from filename
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    
    // Direct check for common formats that should always work
    if (['mp3', 'wav'].includes(extension)) {
      console.log(`[isLikelyPlayable] Common format detected (${extension}), assuming playable`);
      return true;
    }
    
    // Get supported formats
    const supportedFormats = getSupportedFormats();
    console.log(`[isLikelyPlayable] Browser supports formats: ${supportedFormats.join(', ')}`);
    
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
    
    // Special cases for generic types
    const isGenericAudio = file.type.startsWith('audio/');
    const isGenericBinary = file.type === 'application/octet-stream' && 
                           ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'].includes(extension);
    
    // Log decision for debugging
    const decision = hasSupportedMimeType || isGenericAudio || isGenericBinary;
    console.log(`[isLikelyPlayable] File ${file.name} (${file.type}) is ${decision ? 'playable' : 'not playable'}`);
    
    return decision;
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

// New utility to help debugging playback issues
export const getAudioFormatDetails = (file: File): string => {
  try {
    const extension = file.name.split('.').pop()?.toLowerCase() || 'unknown';
    const mimeType = file.type || 'unknown';
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
    
    return `Format: ${extension}, MIME: ${mimeType}, Size: ${sizeInMB}MB, Likely playable: ${isLikelyPlayable(file)}`;
  } catch (e) {
    return `Error getting format details: ${e}`;
  }
};
