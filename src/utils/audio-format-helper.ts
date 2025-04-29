
/**
 * Utility functions for audio format information and handling
 */

const AUDIO_MIME_MAP: Record<string, string[]> = {
  'mp3': ['audio/mpeg', 'audio/mp3'],
  'wav': ['audio/wav', 'audio/wave', 'audio/x-wav'],
  'ogg': ['audio/ogg', 'audio/vorbis'],
  'm4a': ['audio/x-m4a', 'audio/mp4', 'audio/aac'],
  'aac': ['audio/aac', 'audio/aacp'],
  'flac': ['audio/flac', 'audio/x-flac'],
  'webm': ['audio/webm']
};

/**
 * Get audio format details for debugging purposes
 */
export const getAudioFormatDetails = (file: File): string => {
  const fileName = file.name;
  const extension = fileName.split('.').pop()?.toLowerCase() || 'unknown';
  const mimeType = file.type || 'unknown';
  const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
  
  // Try to determine if the browser thinks this is a supported format
  let supportInfo = 'Unknown support status';
  try {
    if (window.AudioContext || (window as any).webkitAudioContext) {
      // Most browsers should have this
      supportInfo = 'Audio API available';
    } else {
      supportInfo = 'No Audio API detected';
    }
    
    // Check if Howler can play this format
    if (window.Howler && typeof window.Howler.codecs === 'function') {
      for (const [format, mimes] of Object.entries(AUDIO_MIME_MAP)) {
        if (mimes.includes(mimeType) || extension === format) {
          const isSupported = window.Howler.codecs(format);
          supportInfo += `, ${format} codec: ${isSupported ? 'supported' : 'not supported'}`;
          break;
        }
      }
    }
  } catch (e) {
    console.warn('Error checking audio support:', e);
    supportInfo += ' (error checking support)';
  }
  
  return `Format: ${extension}, MIME: ${mimeType}, Size: ${fileSizeMB}MB, Support: ${supportInfo}`;
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
    console.warn('Error unmuting audio:', e);
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
    if (window.Howler && typeof window.Howler._autoUnlock === 'function') {
      try {
        window.Howler._autoUnlock();
      } catch (e) {
        console.warn('Error unlocking Howler:', e);
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
