
/**
 * Audio format and compatibility utilities
 */

// Helper to safely unmute audio - useful to handle autoplay restrictions
export const unmuteAudio = (): void => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;

    const audioContext = new AudioContext();
    if (audioContext.state === "suspended") {
      audioContext.resume().catch(err => {
        console.warn("Failed to resume AudioContext:", err);
      });
    }
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

// Check if browser can play this audio format
export const canBrowserPlayFile = (file: File): boolean => {
  const audio = document.createElement('audio');
  const mimeType = getMimeTypeFromFile(file);
  
  if (!mimeType) return false;
  
  // Check if the browser can play this type
  return !!audio.canPlayType(mimeType).replace(/^no$/, '');
};

// Get detailed info about the audio file
export const getAudioFormatDetails = (file: File): string => {
  const mimeType = getMimeTypeFromFile(file);
  const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
  const extension = file.name.split('.').pop()?.toLowerCase() || 'unknown';
  const canPlay = canBrowserPlayFile(file);
  
  return `Format: ${extension.toUpperCase()}, Type: ${mimeType || 'unknown'}, Size: ${sizeInMB}MB, Browser Compatible: ${canPlay ? 'Yes' : 'No'}`;
};
