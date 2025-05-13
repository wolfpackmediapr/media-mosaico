
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

/**
 * Gets the MIME type from a file, with better detection than just relying on file.type
 * @param file The file to inspect
 * @returns A more accurate MIME type
 */
export const getMimeTypeFromFile = (file: File): string => {
  // First, try to use the file's reported MIME type
  if (file.type && file.type.includes('audio/')) {
    return file.type;
  }
  
  // If file.type is empty or not audio, infer from extension
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  switch(extension) {
    case 'mp3':
      return 'audio/mpeg';
    case 'wav':
      return 'audio/wav';
    case 'ogg':
      return 'audio/ogg';
    case 'aac':
      return 'audio/aac';
    case 'flac':
      return 'audio/flac';
    case 'm4a':
      return 'audio/mp4';
    default:
      // Generic audio type if we can't determine specific format
      return 'audio/mpeg'; // Default to MP3 as the most compatible format
  }
};

/**
 * Creates a native HTML5 audio element for a file
 * @param file Audio file to create element for
 * @returns HTML5 Audio element with the file loaded
 */
export const createNativeAudioElement = (file: File): HTMLAudioElement => {
  const audio = new Audio();
  
  // Create blob URL for the file
  const blobUrl = URL.createObjectURL(file);
  
  // Configure the audio element
  audio.src = blobUrl;
  audio.preload = 'metadata';
  
  // Return the configured audio element
  return audio;
};

/**
 * Attempt to unmute audio context for autoplay
 * @returns Promise that resolves when unmute attempt is complete
 */
export const unmuteAudio = (): void => {
  try {
    // Try to access and resume the AudioContext for the page
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    
    if (AudioContext) {
      const context = new AudioContext();
      if (context.state === 'suspended') {
        context.resume().catch(err => {
          console.warn('Error resuming AudioContext:', err);
        });
      }
    }
    
    // Additional technique: create and play a silent audio element
    const silentAudio = document.createElement('audio');
    silentAudio.volume = 0;
    silentAudio.play().catch(() => {
      // This might fail due to autoplay restrictions, which is fine
      // The attempt itself can help unlock audio on some browsers
    });
  } catch (err) {
    console.warn('Error during audio unmute attempt:', err);
  }
};

/**
 * Test if audio can be played back
 * @param file Audio file to test
 * @returns Object with test results
 */
export const testAudioPlayback = async (file: File): Promise<{
  canPlay: boolean;
  needsAdvancedFeatures: boolean;
  error: string | null;
}> => {
  return new Promise(resolve => {
    try {
      // Create a test audio element
      const audio = new Audio();
      const url = URL.createObjectURL(file);
      
      // Set up success handler
      const onCanPlay = () => {
        URL.revokeObjectURL(url);
        resolve({
          canPlay: true,
          // Assume advanced features not needed for files under 10MB
          needsAdvancedFeatures: file.size > 10 * 1024 * 1024,
          error: null
        });
      };
      
      // Set up error handler
      const onError = () => {
        URL.revokeObjectURL(url);
        resolve({
          canPlay: false,
          needsAdvancedFeatures: true, // If native can't play, we need Howler
          error: 'File cannot be played with native audio'
        });
      };
      
      // Set up a timeout in case loading takes too long
      const timeout = setTimeout(() => {
        URL.revokeObjectURL(url);
        audio.removeEventListener('canplay', onCanPlay);
        audio.removeEventListener('error', onError as EventListener);
        
        resolve({
          canPlay: false,
          needsAdvancedFeatures: true,
          error: 'Timeout while testing audio playback'
        });
      }, 5000); // 5 second timeout
      
      // Set up event listeners
      audio.addEventListener('canplay', () => {
        clearTimeout(timeout);
        onCanPlay();
      }, { once: true });
      
      audio.addEventListener('error', () => {
        clearTimeout(timeout);
        onError();
      }, { once: true });
      
      // Try to load and play the audio
      audio.src = url;
      audio.load();
      
    } catch (error) {
      resolve({
        canPlay: false,
        needsAdvancedFeatures: true,
        error: `Error testing playback: ${error}`
      });
    }
  });
};
