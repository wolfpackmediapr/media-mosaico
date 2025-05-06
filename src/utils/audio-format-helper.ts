
/**
 * Attempts to unlock audio on iOS and other platforms that require user interaction
 */
export const unmuteAudio = (): void => {
  try {
    // Create a silent audio context
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Create a buffer with a short silent sound
    const buffer = audioContext.createBuffer(1, 1, 22050);
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    
    // Play the silent sound
    source.start(0);
    
    console.log('[audio-format-helper] Audio context unlocked');
  } catch (error) {
    console.warn('[audio-format-helper] Could not unlock audio:', error);
  }
};

/**
 * Fix common audio format issues
 */
export const normalizeAudioFormat = (file: File): File => {
  // Currently just returns the file, but could be extended to
  // handle format conversion if needed in the future
  return file;
};

/**
 * Gets the MIME type from a file object
 */
export const getMimeTypeFromFile = (file: File): string => {
  // Use the file's type if available
  if (file.type) {
    return file.type;
  }

  // Try to determine type from extension
  const extension = file.name.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'mp3':
      return 'audio/mpeg';
    case 'wav':
      return 'audio/wav';
    case 'ogg':
      return 'audio/ogg';
    case 'm4a':
      return 'audio/mp4';
    case 'aac':
      return 'audio/aac';
    case 'flac':
      return 'audio/flac';
    default:
      return 'audio/mpeg'; // Default to mp3
  }
};

/**
 * Checks if the browser can play a particular audio file
 */
export const canBrowserPlayFile = (file: File): boolean => {
  const audio = document.createElement('audio');
  
  // Get MIME type
  const mimeType = getMimeTypeFromFile(file);
  
  // Check if the browser can play this type
  const canPlay = audio.canPlayType(mimeType);
  
  // The canPlayType method returns "", "maybe", or "probably"
  // An empty string means "no" in the HTML5 spec
  return canPlay !== '';
};

/**
 * Creates a native HTML5 audio element for the given file
 */
export const createNativeAudioElement = (file: File): HTMLAudioElement => {
  const audio = new Audio();
  const url = URL.createObjectURL(file);
  
  audio.src = url;
  audio.preload = 'auto';
  
  // Clean up object URL when done
  audio.addEventListener('canplaythrough', () => {
    console.log('[audio-format-helper] Native audio ready to play');
  });
  
  audio.addEventListener('error', (e) => {
    console.error('[audio-format-helper] Error loading native audio:', e);
    URL.revokeObjectURL(url);
  });
  
  return audio;
};

/**
 * Test if audio can be played
 * Returns an object with test results
 */
export const testAudioPlayback = async (file: File): Promise<{
  canPlay: boolean;
  needsAdvancedFeatures: boolean;
  error: string | null;
}> => {
  return new Promise((resolve) => {
    try {
      const audio = document.createElement('audio');
      const url = URL.createObjectURL(file);
      
      const timeout = setTimeout(() => {
        URL.revokeObjectURL(url);
        resolve({
          canPlay: false,
          needsAdvancedFeatures: true,
          error: 'Timeout while testing audio playback'
        });
      }, 3000);
      
      audio.addEventListener('canplaythrough', () => {
        clearTimeout(timeout);
        URL.revokeObjectURL(url);
        resolve({
          canPlay: true,
          needsAdvancedFeatures: false,
          error: null
        });
      }, { once: true });
      
      audio.addEventListener('error', (e) => {
        clearTimeout(timeout);
        URL.revokeObjectURL(url);
        resolve({
          canPlay: false,
          needsAdvancedFeatures: true,
          error: `Error testing audio: ${e}`
        });
      }, { once: true });
      
      audio.src = url;
      audio.load();
    } catch (error) {
      resolve({
        canPlay: false,
        needsAdvancedFeatures: true,
        error: String(error)
      });
    }
  });
};

/**
 * Get detailed information about an audio file format
 */
export const getAudioFormatDetails = (file: File): {
  extension: string;
  mimeType: string;
  isSupported: boolean;
  recommendation: string;
} => {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  const mimeType = getMimeTypeFromFile(file);
  const isSupported = canBrowserPlayFile(file);
  
  let recommendation = '';
  
  if (!isSupported) {
    recommendation = 'This file format may not be fully supported in all browsers. Consider converting to MP3 format for better compatibility.';
  } else if (file.size > 50 * 1024 * 1024) { // > 50MB
    recommendation = 'This file is quite large. Consider using a compressed format like MP3 for better performance.';
  }
  
  return {
    extension,
    mimeType,
    isSupported,
    recommendation
  };
};
