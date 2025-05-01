
/**
 * Audio format detection and validation utilities
 */

// Common audio MIME types mapped to their extensions
const MIME_TYPE_TO_FORMAT: Record<string, string> = {
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/wav': 'wav',
  'audio/wave': 'wav',
  'audio/x-wav': 'wav',
  'audio/ogg': 'ogg',
  'audio/vorbis': 'ogg',
  'audio/flac': 'flac',
  'audio/x-flac': 'flac',
  'audio/aac': 'aac',
  'audio/mp4': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/webm': 'webm',
  'audio/x-pn-wav': 'wav',
  'audio/x-ms-wma': 'wma'
};

// Extensions to MIME type mapping
const EXTENSION_TO_MIME_TYPE: Record<string, string> = {
  'mp3': 'audio/mpeg',
  'wav': 'audio/wav',
  'ogg': 'audio/ogg',
  'flac': 'audio/flac',
  'aac': 'audio/aac',
  'm4a': 'audio/mp4',
  'webm': 'audio/webm',
  'wma': 'audio/x-ms-wma'
};

/**
 * Detect audio format from a file
 * @param file The file to analyze
 * @returns The detected format or null if unknown
 */
export function detectAudioFormat(file: File): string | null {
  if (!file) return null;
  
  // First try to detect from MIME type
  const mimeFormat = MIME_TYPE_TO_FORMAT[file.type];
  if (mimeFormat) return mimeFormat;
  
  // Then try to detect from file extension
  const fileExtMatch = file.name?.match(/\.([^.]+)$/);
  if (fileExtMatch) {
    const extension = fileExtMatch[1].toLowerCase();
    if (Object.keys(EXTENSION_TO_MIME_TYPE).includes(extension)) {
      return extension;
    }
  }
  
  return null;
}

/**
 * Get the most likely MIME type for a file
 */
export function getMostLikelyMimeType(file: File): string {
  if (!file) return 'audio/mpeg'; // Default to MP3
  
  // If the file has a valid MIME type, use it
  if (file.type && file.type.startsWith('audio/')) {
    return file.type;
  }
  
  // Otherwise try to detect from extension
  const fileExtMatch = file.name?.match(/\.([^.]+)$/);
  if (fileExtMatch) {
    const extension = fileExtMatch[1].toLowerCase();
    const mimeType = EXTENSION_TO_MIME_TYPE[extension];
    if (mimeType) return mimeType;
  }
  
  // Fallback to MP3 if we can't detect
  return 'audio/mpeg';
}

/**
 * Check if the browser can play a specific file
 */
export function canBrowserPlayFile(file: File): boolean {
  if (!file) return false;
  
  // Use the HTML5 Audio API to check if the browser can play this type
  const audio = document.createElement('audio');
  
  // First try with the file's MIME type if available
  if (file.type) {
    const canPlay = audio.canPlayType(file.type);
    if (canPlay === 'probably' || canPlay === 'maybe') {
      return true;
    }
  }
  
  // Also try with the extension-derived MIME type
  const fileExtMatch = file.name?.match(/\.([^.]+)$/);
  if (fileExtMatch) {
    const extension = fileExtMatch[1].toLowerCase();
    const mimeType = EXTENSION_TO_MIME_TYPE[extension];
    if (mimeType) {
      const canPlay = audio.canPlayType(mimeType);
      return canPlay === 'probably' || canPlay === 'maybe';
    }
  }
  
  return false;
}

/**
 * Get detailed information about an audio file for debugging
 */
export function getAudioFormatDetails(file: File): string {
  if (!file) return 'No file provided';
  
  const details = [];
  details.push(`Name: ${file.name || 'Unknown'}`);
  details.push(`Type: ${file.type || 'Unknown'}`);
  details.push(`Size: ${(file.size / 1024).toFixed(2)} KB`);
  
  const format = detectAudioFormat(file);
  details.push(`Detected Format: ${format || 'Unknown'}`);
  
  const audio = document.createElement('audio');
  if (file.type) {
    const canPlay = audio.canPlayType(file.type);
    details.push(`Browser Support (${file.type}): ${canPlay || 'no'}`);
  }
  
  return details.join(', ');
}

/**
 * Validate if an audio URL is accessible
 * @param url The URL to validate
 * @returns Promise that resolves to a validation result
 */
export async function validateAudioURL(url: string): Promise<{valid: boolean, status?: number, error?: string}> {
  try {
    // Use HEAD request to check if the URL is accessible without downloading the full file
    const response = await fetch(url, { method: 'HEAD' });
    
    return {
      valid: response.ok,
      status: response.status
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Attempt to unlock/unmute audio context across browsers
 * This helps deal with autoplay restrictions in browsers
 * @returns true if unmute attempt was performed
 */
export function unmuteAudio(): boolean {
  try {
    // Try to access and resume AudioContext if it exists
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    
    if (!AudioContextClass) {
      console.log('[unmuteAudio] AudioContext not available in this browser');
      return false;
    }

    // Try to get any existing audio contexts first
    if ((window as any).audioContexts) {
      const existingContexts = (window as any).audioContexts;
      let resumedAny = false;
      
      for (let i = 0; i < existingContexts.length; i++) {
        const ctx = existingContexts[i];
        if (ctx && ctx.state === 'suspended') {
          console.log('[unmuteAudio] Resuming existing AudioContext');
          ctx.resume().catch((e: Error) => console.warn('[unmuteAudio] Error resuming context:', e));
          resumedAny = true;
        }
      }
      
      if (resumedAny) return true;
    }

    // Create a new AudioContext if needed
    const tempContext = new AudioContextClass();
    
    // Store for future use if it doesn't exist yet
    if (!(window as any).audioContexts) {
      (window as any).audioContexts = [];
    }
    (window as any).audioContexts.push(tempContext);
    
    console.log('[unmuteAudio] AudioContext state:', tempContext.state);
    
    // If suspended, try to resume it
    if (tempContext.state === 'suspended') {
      tempContext.resume().catch((e: Error) => console.warn('[unmuteAudio] Error resuming context:', e));
    }
    
    // Create a silent oscillator to trigger audio unlock
    const oscillator = tempContext.createOscillator();
    const gainNode = tempContext.createGain();
    gainNode.gain.value = 0; // Completely silent
    oscillator.connect(gainNode);
    gainNode.connect(tempContext.destination);
    
    // Play for a very short time
    oscillator.start(0);
    setTimeout(() => {
      oscillator.stop();
      // Don't disconnect - it can cause issues in some browsers
    }, 1);
    
    console.log('[unmuteAudio] Attempted to unmute audio');
    return true;
  } catch (e) {
    console.warn('[unmuteAudio] Error during audio unmute attempt:', e);
    return false;
  }
}
