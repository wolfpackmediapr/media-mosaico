
// This is a new file to add helper functions for audio format support and testing

/**
 * Creates a native HTML5 audio element for a file
 */
export const createNativeAudioElement = (file: File): HTMLAudioElement => {
  const audio = new Audio();
  const url = URL.createObjectURL(file);
  audio.src = url;
  audio.load();
  return audio;
};

/**
 * Gets the MIME type from a file object
 */
export const getMimeTypeFromFile = (file: File): string => {
  return file.type || `audio/${file.name.split('.').pop()?.toLowerCase()}`;
};

/**
 * Checks if the browser can play a specific audio format
 */
export const canBrowserPlayAudioType = (mimeType: string): boolean => {
  const audio = document.createElement('audio');
  return audio.canPlayType(mimeType) !== '';
};

/**
 * Returns a detailed string with file information
 */
export const getAudioFormatDetails = (file: File): string => {
  const extension = file.name.split('.').pop()?.toLowerCase();
  const mimeType = getMimeTypeFromFile(file);
  const audio = document.createElement('audio');
  const canPlay = audio.canPlayType(mimeType);
  
  return `File: ${file.name}, Size: ${(file.size / 1024 / 1024).toFixed(2)}MB, ` +
         `Type: ${mimeType}, Extension: ${extension}, ` +
         `Browser support: ${canPlay || 'none'}`;
};

/**
 * Checks if the browser can play a specific file
 */
export const canBrowserPlayFile = (file: File): boolean => {
  const mimeType = getMimeTypeFromFile(file);
  return canBrowserPlayAudioType(mimeType);
};

/**
 * Tests if a file can be played and whether it requires special features
 */
export const testAudioPlayback = async (file: File): Promise<{ 
  canPlay: boolean; 
  needsAdvancedFeatures: boolean;
  error?: string;
}> => {
  return new Promise(resolve => {
    try {
      const audio = new Audio();
      const url = URL.createObjectURL(file);
      
      const needsAdvancedFeatures = 
        // Files over 50MB might benefit from streaming
        file.size > 50 * 1024 * 1024 || 
        // Complex audio formats that might need special decoding
        /\.(ogg|flac|aac|m4a|wma|opus)$/i.test(file.name);
      
      const onCanPlay = () => {
        cleanup();
        resolve({ 
          canPlay: true, 
          needsAdvancedFeatures 
        });
      };
      
      const onError = () => {
        cleanup();
        resolve({ 
          canPlay: false, 
          needsAdvancedFeatures: true,
          error: `Cannot play file format: ${file.name.split('.').pop()}` 
        });
      };
      
      const cleanup = () => {
        audio.removeEventListener('canplay', onCanPlay);
        audio.removeEventListener('error', onError);
        URL.revokeObjectURL(url);
      };
      
      // Set up timeout in case the audio doesn't fire events
      const timeoutId = setTimeout(() => {
        cleanup();
        resolve({ 
          canPlay: false, 
          needsAdvancedFeatures: true,
          error: 'Timeout while testing audio playback' 
        });
      }, 3000);
      
      audio.addEventListener('canplay', onCanPlay, { once: true });
      audio.addEventListener('error', onError, { once: true });
      
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
 * Attempts to unmute audio context - useful for mobile browsers
 */
export const unmuteAudio = (): void => {
  try {
    // Create a silent audio buffer
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    
    const audioContext = new AudioContext();
    const buffer = audioContext.createBuffer(1, 1, 22050);
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    
    // Play and immediately stop
    if (source.start) {
      source.start(0);
      source.stop(0.001);
    }
    
    // Also resume AudioContext if suspended
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
    
  } catch (e) {
    console.warn('Could not unmute audio:', e);
  }
};
