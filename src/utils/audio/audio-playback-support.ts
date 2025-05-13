
/**
 * Audio playback support utilities
 * Provides functions for checking browser compatibility with different audio formats
 */
import { getMimeTypeFromFile } from './audio-format-detection';

/**
 * Checks if the browser can play a specific audio file
 * @param file Audio file to check
 * @returns boolean indicating if the browser supports the format
 */
export const canBrowserPlayFile = (file: File): boolean => {
  const audio = document.createElement('audio');
  const mimeType = getMimeTypeFromFile(file);
  
  // canPlayType returns "", "maybe", or "probably"
  return audio.canPlayType(mimeType) !== '';
};

/**
 * Test if audio playback works correctly
 * @param file Audio file to test
 * @returns Promise with test results
 */
export const testAudioPlayback = async (file: File): Promise<{
  canPlay: boolean;
  needsAdvancedFeatures: boolean;
  error?: string;
}> => {
  return new Promise((resolve) => {
    try {
      const audio = new Audio();
      const url = URL.createObjectURL(file);
      let isResolved = false;
      
      // Set a timeout in case the check hangs
      const timeout = setTimeout(() => {
        if (!isResolved) {
          URL.revokeObjectURL(url);
          isResolved = true;
          resolve({
            canPlay: false,
            needsAdvancedFeatures: true,
            error: 'Timeout while testing audio playback'
          });
        }
      }, 3000);
      
      // Check if audio can play
      audio.addEventListener('canplay', () => {
        if (!isResolved) {
          clearTimeout(timeout);
          URL.revokeObjectURL(url);
          isResolved = true;
          resolve({
            canPlay: true,
            needsAdvancedFeatures: false
          });
        }
      }, { once: true });
      
      // Handle errors
      audio.addEventListener('error', (e) => {
        if (!isResolved) {
          clearTimeout(timeout);
          URL.revokeObjectURL(url);
          isResolved = true;
          
          // Get error details
          const error = (e.target as HTMLAudioElement).error;
          const errorMessage = error ? error.message : 'Unknown error';
          
          resolve({
            canPlay: false,
            needsAdvancedFeatures: true,
            error: errorMessage
          });
        }
      }, { once: true });
      
      // Start loading the audio
      audio.src = url;
      audio.load();
      
    } catch (error) {
      resolve({
        canPlay: false,
        needsAdvancedFeatures: true,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
};

/**
 * Unmutes audio across the page - useful for mobile devices that require user interaction
 * @returns Promise that resolves when audio is unmuted or rejects on error
 */
export const unmuteAudio = async (): Promise<void> => {
  try {
    // Create a silent audio context to unmute the device
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Create a silent buffer
    const buffer = audioContext.createBuffer(1, 1, 22050);
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    
    // Play and immediately stop the sound
    source.start(0);
    source.stop(0.001);
    
    // Resume the audio context if it's suspended
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }
    
    console.log('[audio-playback-support] Audio successfully unmuted');
  } catch (error) {
    console.error('[audio-playback-support] Error unmuting audio:', error);
    throw error;
  }
};
