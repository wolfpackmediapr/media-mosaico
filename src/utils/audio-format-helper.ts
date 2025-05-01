
/**
 * Utility functions for audio format information and handling
 */

// Import Howler directly
import { Howl, Howler } from 'howler';

// Enhanced MIME type mapping with more alternatives for each format
const AUDIO_MIME_MAP: Record<string, string[]> = {
  'mp3': ['audio/mpeg', 'audio/mp3', 'audio/x-mp3', 'audio/x-mpeg', 'audio/mpeg3', 'audio/x-mpeg3'],
  'wav': ['audio/wav', 'audio/wave', 'audio/x-wav', 'audio/webm-wav', 'audio/webm-wave'],
  'ogg': ['audio/ogg', 'audio/vorbis', 'audio/x-ogg', 'application/ogg'],
  'm4a': ['audio/x-m4a', 'audio/mp4', 'audio/aac', 'audio/x-mp4'],
  'aac': ['audio/aac', 'audio/aacp', 'audio/x-aac', 'audio/x-hx-aac-adts'],
  'flac': ['audio/flac', 'audio/x-flac'],
  'webm': ['audio/webm', 'audio/webm; codecs=opus']
};

// Reverse mapping from MIME to format extension
const MIME_TO_FORMAT: Record<string, string> = {};

// Initialize reverse mapping
Object.entries(AUDIO_MIME_MAP).forEach(([format, mimeTypes]) => {
  mimeTypes.forEach(mime => {
    MIME_TO_FORMAT[mime] = format;
  });
});

/**
 * Get audio format details for debugging purposes
 */
export const getAudioFormatDetails = (file: File): string => {
  const fileName = file.name;
  const extension = fileName.split('.').pop()?.toLowerCase() || 'unknown';
  const mimeType = file.type || 'unknown';
  const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
  
  // Try to determine if the browser thinks this is a supported format
  let supportInfo = 'Estado de soporte desconocido';
  try {
    if (window.AudioContext || (window as any).webkitAudioContext) {
      // Most browsers should have this
      supportInfo = 'API de Audio disponible';
    } else {
      supportInfo = 'No se detectó API de Audio';
    }
    
    // Check if Howler can play this format
    if (typeof (Howler as any).codecs === 'function') {
      for (const [format, mimes] of Object.entries(AUDIO_MIME_MAP)) {
        if (mimes.includes(mimeType) || extension === format) {
          const isSupported = (Howler as any).codecs(format);
          supportInfo += `, códec ${format}: ${isSupported ? 'soportado' : 'no soportado'}`;
          break;
        }
      }
    }
    
    // Enhanced browser support detection
    const audio = new Audio();
    if (mimeType !== 'unknown') {
      const canPlay = audio.canPlayType(mimeType);
      supportInfo += `, navegador: ${canPlay ? (canPlay === 'probably' ? 'compatible' : 'posiblemente compatible') : 'no compatible'}`;
    }
    
  } catch (e) {
    console.warn('Error al verificar soporte de audio:', e);
    supportInfo += ' (error al verificar soporte)';
  }
  
  return `Formato: ${extension}, MIME: ${mimeType}, Tamaño: ${fileSizeMB}MB, Soporte: ${supportInfo}`;
};

/**
 * Detect format from file extension and MIME type
 */
export const detectAudioFormat = (file: File): string | null => {
  if (!file) return null;
  
  // Try to get format from MIME type first
  if (file.type && MIME_TO_FORMAT[file.type]) {
    return MIME_TO_FORMAT[file.type];
  }
  
  // If not found by MIME, try file extension
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (extension && AUDIO_MIME_MAP[extension]) {
    return extension;
  }
  
  // If we can't detect the format, return null
  return null;
};

/**
 * Get the most likely MIME type for a file based on extension
 */
export const getMostLikelyMimeType = (file: File): string | null => {
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (extension && AUDIO_MIME_MAP[extension]) {
    return AUDIO_MIME_MAP[extension][0]; // Return first (most common) MIME type
  }
  return file.type || null;
};

/**
 * Helper function to create an Audio element to test if a format is playable
 */
export const isAudioFormatSupported = (format: string): boolean => {
  try {
    // Try using Howler's codec detection first
    if (typeof (Howler as any).codecs === 'function') {
      return (Howler as any).codecs(format);
    }
    
    // Fallback to standard Audio element capability detection
    const audio = document.createElement('audio');
    
    // Map format extension to mime type for testing
    if (AUDIO_MIME_MAP[format]) {
      // Try all MIME types associated with this format
      for (const mimeType of AUDIO_MIME_MAP[format]) {
        const support = audio.canPlayType(mimeType);
        if (support === 'probably' || support === 'maybe') {
          return true;
        }
      }
    }
    
    return false;
  } catch (e) {
    console.warn('Error al verificar soporte de formato:', e);
    return false;
  }
};

/**
 * Check if browser can play a specific file
 */
export const canBrowserPlayFile = (file: File): boolean => {
  try {
    const audio = document.createElement('audio');
    
    // Check MIME type first
    if (file.type) {
      const support = audio.canPlayType(file.type);
      if (support === 'probably' || support === 'maybe') {
        return true;
      }
    }
    
    // Try by extension as fallback
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (extension && AUDIO_MIME_MAP[extension]) {
      for (const mime of AUDIO_MIME_MAP[extension]) {
        const support = audio.canPlayType(mime);
        if (support === 'probably' || support === 'maybe') {
          return true;
        }
      }
    }
    
    return false;
  } catch (e) {
    console.warn('Error checking browser playback support:', e);
    return false;
  }
};

/**
 * Helper to unmute audio context after user interaction
 * This is needed for some browsers that block audio until user interacts
 */
export const unmuteAudio = () => {
  try {
    // Create an empty audio context
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    
    if (AudioContext) {
      const context = new AudioContext();
      
      // Create an empty buffer
      const buffer = context.createBuffer(1, 1, 22050);
      const source = context.createBufferSource();
      source.buffer = buffer;
      
      // Connect to output
      source.connect(context.destination);
      
      // Play the empty sound (this will enable audio in some browsers)
      if (source.start) {
        source.start(0);
      } else if ((source as any).noteOn) {
        (source as any).noteOn(0);
      }
      
      // Resume the context if it's suspended
      if (context.state === 'suspended') {
        context.resume();
      }
      
      // Also try to unlock Howler's audio context
      if (typeof (Howler as any).ctx !== 'undefined') {
        if ((Howler as any).ctx.state === 'suspended') {
          (Howler as any).ctx.resume();
        }
      }
      
      // Disconnect and release
      setTimeout(() => {
        source.disconnect();
        if (context.close) {
          context.close();
        }
      }, 100);
      
      return true;
    }
  } catch (e) {
    console.warn('Error al activar el audio:', e);
  }
  
  return false;
};

/**
 * Register global event listeners to enable audio on first user interaction
 */
export const setupAudioUnlockListeners = () => {
  // Only register once
  if ((window as any).__audioUnlockListenersRegistered) return;
  (window as any).__audioUnlockListenersRegistered = true;
  
  const unlockAudio = () => {
    unmuteAudio();
    
    // Try to unlock Howler specifically
    if (typeof (Howler as any)._autoUnlock === 'function') {
      try {
        (Howler as any)._autoUnlock();
      } catch (e) {
        console.warn('Error al desbloquear Howler:', e);
      }
    }
  };
  
  // Common user interaction events
  const events = ['click', 'touchstart', 'touchend', 'keydown'];
  
  events.forEach(event => {
    document.addEventListener(event, unlockAudio, { once: true });
  });
};

// Call this function on module import to set up listeners
setupAudioUnlockListeners();
