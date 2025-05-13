/**
 * Audio element factory utilities
 * Provides functions for creating and managing HTML audio elements
 */
import { getMimeTypeFromFile } from './audio-format-detection';

/**
 * Creates an HTMLAudioElement for a file
 * @param file Audio file to create element for
 * @returns HTMLAudioElement
 */
export const createNativeAudioElement = (file: File): HTMLAudioElement => {
  const audio = new Audio();
  
  try {
    // Create a URL for the file
    const url = URL.createObjectURL(file);
    audio.src = url;
    
    // When the audio element is no longer needed, revoke the object URL
    audio.addEventListener('error', () => {
      URL.revokeObjectURL(url);
    }, { once: true });
    
    // Also revoke URL when it's successfully loaded (browser will cache it)
    audio.addEventListener('canplaythrough', () => {
      // Keep URL valid for a while - some browsers need it
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 30000);
    }, { once: true });
    
    // Load the audio
    audio.load();
    
    return audio;
  } catch (error) {
    console.error('[audio-element-factory] Error creating audio element:', error);
    return audio;
  }
};

/**
 * Creates an audio context for advanced audio processing
 * @returns AudioContext or null if not supported
 */
export const createAudioContext = (): AudioContext | null => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) {
      console.warn('[audio-element-factory] AudioContext not supported in this browser');
      return null;
    }
    return new AudioContextClass();
  } catch (error) {
    console.error('[audio-element-factory] Error creating AudioContext:', error);
    return null;
  }
};

/**
 * Safely disposes of an audio element and its resources
 * @param audioElement The audio element to dispose
 */
export const disposeAudioElement = (audioElement: HTMLAudioElement | null): void => {
  if (!audioElement) return;
  
  try {
    // Stop playback
    audioElement.pause();
    
    // Remove src to stop any loading/buffering
    const src = audioElement.src;
    audioElement.src = '';
    audioElement.load();
    
    // Remove event listeners to prevent memory leaks
    audioElement.oncanplay = null;
    audioElement.oncanplaythrough = null;
    audioElement.onerror = null;
    audioElement.onended = null;
    
    // If src was a blob URL, revoke it
    if (src && src.startsWith('blob:')) {
      URL.revokeObjectURL(src);
    }
  } catch (error) {
    console.error('[audio-element-factory] Error disposing audio element:', error);
  }
};
