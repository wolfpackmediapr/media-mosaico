
/**
 * Audio format helper utilities
 * Provides functions for audio format detection, browser support checking, and audio element creation
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
 * Checks if the browser can play a specific audio file
 * @param file Audio file to check
 * @returns boolean indicating if the browser supports the format
 */
export const canBrowserPlayFile = (file: File): boolean => {
  const audio = document.createElement('audio');
  const mimeType = getMimeTypeFromFile(file);
  
  // canPlayType returns "", "maybe", or "probably"
  return audio.canPlayType(mimeType) !== '';
};

/**
 * Creates an HTMLAudioElement for a file
 * @param file Audio file to create element for
 * @returns HTMLAudioElement
 */
export const createNativeAudioElement = (file: File): HTMLAudioElement => {
  const audio = new Audio();
  
  try {
    // Create a URL for the file
    const url = URL.createObjectURL(file);
    audio.src = url;
    
    // When the audio element is no longer needed, revoke the object URL
    audio.addEventListener('error', () => {
      URL.revokeObjectURL(url);
    }, { once: true });
    
    // Also revoke URL when it's successfully loaded (browser will cache it)
    audio.addEventListener('canplaythrough', () => {
      // Keep URL valid for a while - some browsers need it
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 30000);
    }, { once: true });
    
    // Load the audio
    audio.load();
    
    return audio;
  } catch (error) {
    console.error('[audio-format-helper] Error creating audio element:', error);
    return audio;
  }
};

/**
 * Unmutes audio across the page - useful for mobile devices that require user interaction
 * @returns Promise that resolves when audio is unmuted or rejects on error
 */
export const unmuteAudio = async (): Promise<void> => {
  try {
    // Create a silent audio context to unmute the device
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Create a silent buffer
    const buffer = audioContext.createBuffer(1, 1, 22050);
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    
    // Play and immediately stop the sound
    source.start(0);
    source.stop(0.001);
    
    // Resume the audio context if it's suspended
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }
    
    console.log('[audio-format-helper] Audio successfully unmuted');
  } catch (error) {
    console.error('[audio-format-helper] Error unmuting audio:', error);
    throw error;
  }
};

/**
 * Test if audio playback works correctly
 * @param file Audio file to test
 * @returns Promise with test results
 */
export const testAudioPlayback = async (file: File): Promise<{
  canPlay: boolean;
  needsAdvancedFeatures: boolean;
  error?: string;
}> => {
  return new Promise((resolve) => {
    try {
      const audio = new Audio();
      const url = URL.createObjectURL(file);
      let isResolved = false;
      
      // Set a timeout in case the check hangs
      const timeout = setTimeout(() => {
        if (!isResolved) {
          URL.revokeObjectURL(url);
          isResolved = true;
          resolve({
            canPlay: false,
            needsAdvancedFeatures: true,
            error: 'Timeout while testing audio playback'
          });
        }
      }, 3000);
      
      // Check if audio can play
      audio.addEventListener('canplay', () => {
        if (!isResolved) {
          clearTimeout(timeout);
          URL.revokeObjectURL(url);
          isResolved = true;
          resolve({
            canPlay: true,
            needsAdvancedFeatures: false
          });
        }
      }, { once: true });
      
      // Handle errors
      audio.addEventListener('error', (e) => {
        if (!isResolved) {
          clearTimeout(timeout);
          URL.revokeObjectURL(url);
          isResolved = true;
          
          // Get error details
          const error = (e.target as HTMLAudioElement).error;
          const errorMessage = error ? error.message : 'Unknown error';
          
          resolve({
            canPlay: false,
            needsAdvancedFeatures: true,
            error: errorMessage
          });
        }
      }, { once: true });
      
      // Start loading the audio
      audio.src = url;
      audio.load();
      
    } catch (error) {
      resolve({
        canPlay: false,
        needsAdvancedFeatures: true,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
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
