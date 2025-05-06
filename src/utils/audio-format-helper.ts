
/**
 * Attempts to unlock audio context on iOS and other mobile browsers
 * This needs to be called on a user interaction like click/touch
 * to allow audio to play without restrictions
 */
export const unmuteAudio = (): void => {
  try {
    // Create a temporary audio context
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;

    // Create an audio context
    const audioCtx = new AudioContext();

    // Create a short silent sound
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    gainNode.gain.value = 0; // silent
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    // Play and stop the silent sound immediately
    oscillator.start(0);
    oscillator.stop(0.1);

    // Check if context is in suspended state (iOS)
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().then(() => {
        console.log('[audio-helper] Audio context unlocked successfully');
      }).catch(err => {
        console.warn('[audio-helper] Could not unlock audio context:', err);
      });
    }
  } catch (err) {
    console.warn('[audio-helper] Error attempting to unlock audio:', err);
  }
};

/**
 * Check if the current browser is Safari
 */
export const isSafari = (): boolean => {
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
};

/**
 * Check if device is iOS
 */
export const isIOS = (): boolean => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

/**
 * Check if current environment likely needs audio unlocking
 */
export const needsAudioUnlocking = (): boolean => {
  return isIOS() || isSafari();
};

/**
 * Get MIME type from a file
 */
export const getMimeTypeFromFile = (file: File): string => {
  // Return the file's type if available
  if (file.type) {
    return file.type;
  }
  
  // Try to determine MIME type from extension
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  
  const mimeTypes: Record<string, string> = {
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'ogg': 'audio/ogg',
    'aac': 'audio/aac',
    'm4a': 'audio/mp4',
    'flac': 'audio/flac',
    'webm': 'audio/webm',
  };
  
  return mimeTypes[extension] || 'audio/mpeg'; // Default to mp3 if unknown
};

/**
 * Check if the browser can play a specific file type
 */
export const canBrowserPlayFile = (file: File): boolean => {
  const audio = document.createElement('audio');
  const mimeType = getMimeTypeFromFile(file);
  
  // Check if audio element can play this type
  return audio.canPlayType(mimeType) !== '';
};

/**
 * Get detailed audio format information
 */
export const getAudioFormatDetails = (file: File): string => {
  const extension = file.name.split('.').pop()?.toLowerCase();
  const mimeType = getMimeTypeFromFile(file);
  const fileSize = Math.round(file.size / 1024); // KB
  
  return `Format: ${extension?.toUpperCase() || 'Unknown'}, MIME: ${mimeType}, Size: ${fileSize}KB`;
};

/**
 * Create a native audio element for a file
 */
export const createNativeAudioElement = (file: File): HTMLAudioElement => {
  const audio = new Audio();
  audio.src = URL.createObjectURL(file);
  audio.preload = 'auto';
  return audio;
};

/**
 * Test if audio file can be played
 */
export const testAudioPlayback = async (file: File): Promise<{
  canPlay: boolean;
  needsAdvancedFeatures: boolean;
  error: string | null;
}> => {
  return new Promise((resolve) => {
    try {
      const audio = new Audio();
      audio.volume = 0; // silent test
      
      // Set up event handlers
      const onCanPlay = () => {
        cleanup();
        resolve({
          canPlay: true,
          needsAdvancedFeatures: false,
          error: null
        });
      };
      
      const onError = (e: ErrorEvent) => {
        cleanup();
        resolve({
          canPlay: false,
          needsAdvancedFeatures: true,
          error: `Error testing playback: ${e.message || 'Unknown error'}`
        });
      };
      
      // Set a timeout in case the event handlers don't fire
      const timeoutId = setTimeout(() => {
        cleanup();
        resolve({
          canPlay: false,
          needsAdvancedFeatures: true,
          error: 'Test playback timed out'
        });
      }, 3000);
      
      // Clean up function
      const cleanup = () => {
        clearTimeout(timeoutId);
        URL.revokeObjectURL(audio.src);
        audio.removeEventListener('canplaythrough', onCanPlay);
        audio.removeEventListener('error', onError as EventListener);
      };
      
      // Set up event listeners
      audio.addEventListener('canplaythrough', onCanPlay, { once: true });
      audio.addEventListener('error', onError as EventListener, { once: true });
      
      // Start loading
      audio.src = URL.createObjectURL(file);
      audio.load();
      
    } catch (error: any) {
      return resolve({
        canPlay: false,
        needsAdvancedFeatures: true,
        error: `Error during test setup: ${error?.message || 'Unknown error'}`
      });
    }
  });
};
