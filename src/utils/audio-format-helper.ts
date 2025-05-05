
// This file contains helper functions for audio format support and testing

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
      
      const onError = (e: Event) => {
        cleanup();
        const audioElement = e.target as HTMLAudioElement;
        const errorCode = audioElement.error ? audioElement.error.code : 0;
        const errorMessage = getAudioErrorMessage(errorCode);
        
        console.warn('[testAudioPlayback] Native audio error:', errorMessage);
        
        resolve({ 
          canPlay: false, 
          needsAdvancedFeatures: true,
          error: `Cannot play file: ${errorMessage}` 
        });
      };
      
      const cleanup = () => {
        audio.removeEventListener('canplay', onCanPlay);
        audio.removeEventListener('error', onError as EventListener);
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
      audio.addEventListener('error', onError as EventListener, { once: true });
      
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
 * Get a human-readable error message from an audio error code
 */
const getAudioErrorMessage = (errorCode: number): string => {
  switch (errorCode) {
    case 1:
      return 'Fetching process aborted by user';
    case 2:
      return 'Error occurred when downloading';
    case 3:
      return 'Error occurred when decoding';
    case 4:
      return 'Audio not supported';
    default:
      return 'Unknown audio error';
  }
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

/**
 * Detects browser information to handle audio compatibility issues
 */
export const getBrowserInfo = (): { name: string; version: string; isMobile: boolean } => {
  const userAgent = navigator.userAgent;
  let name = 'Unknown';
  let version = 'Unknown';
  const isMobile = /Mobi|Android/i.test(userAgent);
  
  if (userAgent.includes('Firefox')) {
    name = 'Firefox';
    version = userAgent.match(/Firefox\/([\d.]+)/)?.[1] || '';
  } else if (userAgent.includes('Chrome')) {
    name = 'Chrome';
    version = userAgent.match(/Chrome\/([\d.]+)/)?.[1] || '';
  } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    name = 'Safari';
    version = userAgent.match(/Version\/([\d.]+)/)?.[1] || '';
  } else if (userAgent.includes('Edge') || userAgent.includes('Edg')) {
    name = 'Edge';
    version = userAgent.match(/Edge?\/([\d.]+)/)?.[1] || '';
  }
  
  return { name, version, isMobile };
};
