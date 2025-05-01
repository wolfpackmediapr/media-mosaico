
/**
 * Audio format and compatibility utilities
 */

// Helper to safely unmute audio - useful to handle autoplay restrictions
export const unmuteAudio = (): void => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;

    // Try to resume any existing AudioContext
    const audioContext = new AudioContext();
    if (audioContext.state === "suspended") {
      audioContext.resume().catch(err => {
        console.warn("Failed to resume AudioContext:", err);
      });
    }
    
    // Also try to unlock audio by creating and playing a short buffer
    const buffer = audioContext.createBuffer(1, 1, 22050);
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.start(0);
    
    // Create and start a silent HTML5 audio element to help unlock playback
    const silentAudio = new Audio();
    silentAudio.muted = true;
    silentAudio.play().catch(() => {}); // Ignore errors
  } catch (error) {
    console.warn("Error initializing AudioContext:", error);
  }
};

// Get MIME type from file extension
export const getMimeTypeFromFile = (file: File): string | null => {
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (!extension) return null;

  // Map file extensions to MIME types
  const mimeTypes: Record<string, string> = {
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
    m4a: 'audio/mp4',
    aac: 'audio/aac',
    flac: 'audio/flac',
    webm: 'audio/webm',
  };

  return mimeTypes[extension] || null;
};

// Check if browser can play this audio format using native HTML5 Audio
export const canBrowserPlayFile = (file: File): boolean => {
  const audio = document.createElement('audio');
  const mimeType = getMimeTypeFromFile(file);
  
  if (!mimeType) return false;
  
  // Check if the browser can play this type
  return !!audio.canPlayType(mimeType).replace(/^no$/, '');
};

// Try to play a small portion of audio to verify decoder support
export const testAudioPlayback = async (file: File): Promise<{canPlay: boolean, error?: string}> => {
  return new Promise((resolve) => {
    try {
      const audio = new Audio();
      const url = URL.createObjectURL(file);
      
      const onCanPlay = () => {
        cleanup();
        resolve({canPlay: true});
      };
      
      const onError = () => {
        cleanup();
        resolve({
          canPlay: false, 
          error: `Failed to decode audio file: ${file.name}`
        });
      };
      
      const cleanup = () => {
        audio.removeEventListener('canplay', onCanPlay);
        audio.removeEventListener('error', onError);
        URL.revokeObjectURL(url);
      };
      
      // Set event handlers
      audio.addEventListener('canplay', onCanPlay);
      audio.addEventListener('error', onError);
      
      // Attempt to load the file
      audio.src = url;
      audio.load();
      
      // Set timeout to avoid hanging too long
      setTimeout(() => {
        if (audio.readyState < 2) { // HAVE_CURRENT_DATA
          cleanup();
          resolve({canPlay: false, error: 'Timeout loading audio file'});
        }
      }, 3000);
    } catch (e) {
      resolve({canPlay: false, error: String(e)});
    }
  });
};

// Get detailed info about the audio file
export const getAudioFormatDetails = (file: File): string => {
  const mimeType = getMimeTypeFromFile(file);
  const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
  const extension = file.name.split('.').pop()?.toLowerCase() || 'unknown';
  const canPlay = canBrowserPlayFile(file);
  
  return `Format: ${extension.toUpperCase()}, Type: ${mimeType || 'unknown'}, Size: ${sizeInMB}MB, Browser Compatible: ${canPlay ? 'Yes' : 'No'}`;
};

// Create a preloaded HTML5 audio element for a file
export const createNativeAudioElement = (file: File): HTMLAudioElement => {
  const audio = new Audio();
  audio.src = URL.createObjectURL(file);
  
  // Cleanup object URL when done
  audio.addEventListener('canplay', () => {
    console.log(`[Native Audio] File ${file.name} can be played`);
  });
  
  audio.addEventListener('error', (e) => {
    console.error(`[Native Audio] Error with file ${file.name}:`, e);
    // Cleanup
    URL.revokeObjectURL(audio.src);
  });
  
  return audio;
};
