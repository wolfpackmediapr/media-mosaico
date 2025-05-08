/**
 * Audio format helper utilities
 */
import { createNewBlobUrl } from "./audio-url-validator";

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
 * with proper error checking
 */
export const createNativeAudioElement = (file: File): HTMLAudioElement | null => {
  try {
    // Validate file
    if (!file || !(file instanceof File)) {
      console.error('[audio-format-helper] Invalid file provided to createNativeAudioElement');
      return null;
    }

    // Check for storage URL first
    if ('storageUrl' in file && typeof file.storageUrl === 'string' && file.storageUrl) {
      console.log('[HowlerPlayer] Using existing storage URL for file');
      const audioElement = new Audio(file.storageUrl);
      console.log('[HowlerPlayer] Using storage URL for native audio:', file.storageUrl);
      return audioElement;
    } 

    // Otherwise use blob URL
    const blobUrl = createNewBlobUrl(file);
    if (!blobUrl) {
      console.error('[audio-format-helper] Could not create blob URL for file');
      return null;
    }
    
    const audioElement = new Audio(blobUrl);
    return audioElement;
  } catch (error) {
    console.error('[audio-format-helper] Error creating native audio element:', error);
    return null;
  }
};

/**
 * Test if audio can be played
 * Returns an object with test results
 */
export const testAudioPlayback = async (file: File): Promise<{
  canPlay: boolean;
  needsAdvancedFeatures: boolean;
  error?: string;
}> => {
  return new Promise((resolve) => {
    try {
      // Validate file
      if (!file || !(file instanceof File)) {
        console.error('[audio-format-helper] Invalid file provided to testAudioPlayback');
        resolve({
          canPlay: false,
          needsAdvancedFeatures: true,
          error: 'Invalid file object'
        });
        return;
      }
      
      const audioElement = createNativeAudioElement(file);
      if (!audioElement) {
        resolve({
          canPlay: false,
          needsAdvancedFeatures: true,
          error: 'Could not create audio element'
        });
        return;
      }
      
      // Set timeout to avoid hanging
      const timeout = setTimeout(() => {
        console.log('[audio-format-helper] Audio test timed out, assuming needs advanced features');
        resolve({
          canPlay: false,
          needsAdvancedFeatures: true,
          error: 'Test timed out'
        });
      }, 2000);
      
      audioElement.oncanplaythrough = () => {
        clearTimeout(timeout);
        console.log('[audio-format-helper] Audio can play through natively');
        resolve({
          canPlay: true,
          needsAdvancedFeatures: false
        });
      };
      
      audioElement.onerror = (e) => {
        clearTimeout(timeout);
        console.error('[audio-format-helper] Error testing audio playback:', e);
        resolve({
          canPlay: false,
          needsAdvancedFeatures: true,
          error: audioElement.error ? audioElement.error.message : 'Unknown playback error'
        });
      };
      
      audioElement.load();
    } catch (error) {
      console.error('[audio-format-helper] Exception testing audio playback:', error);
      resolve({
        canPlay: false,
        needsAdvancedFeatures: true,
        error: error instanceof Error ? error.message : 'Unknown error'
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
