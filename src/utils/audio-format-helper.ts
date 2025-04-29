
/**
 * Helper utilities for audio format detection and processing
 */

/**
 * Check if the browser is likely to have issues with audio playback
 */
export const hasAudioPlaybackRestrictions = (): boolean => {
  const ua = navigator.userAgent;
  
  // iOS Safari and WebKit browsers have strict autoplay policies
  const isIOS = /iPhone|iPad|iPod/.test(ua);
  const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua);
  const isWebKit = /AppleWebKit/.test(ua);
  
  return isIOS || (isSafari && isWebKit);
};

/**
 * Get detailed information about an audio file for debugging
 */
export const getAudioFormatDetails = (file: File): string => {
  if (!file) return 'No file provided';
  
  const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'unknown';
  const sizeKB = (file.size / 1024).toFixed(1);
  const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
  
  return `Name: ${file.name}, Type: ${file.type}, Size: ${sizeKB}KB (${sizeMB}MB), Extension: ${fileExtension}`;
};

/**
 * Check if audio format is widely supported across browsers
 */
export const isWidelySupported = (file: File): boolean => {
  const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
  const widelySupported = ['mp3', 'wav', 'aac'];
  
  return widelySupported.includes(fileExtension);
};

/**
 * Get browser audio compatibility information
 */
export const getBrowserAudioSupport = (): string => {
  const canPlayMp3 = document.createElement('audio').canPlayType('audio/mp3') !== '';
  const canPlayWav = document.createElement('audio').canPlayType('audio/wav') !== '';
  const canPlayOgg = document.createElement('audio').canPlayType('audio/ogg') !== '';
  const canPlayAac = document.createElement('audio').canPlayType('audio/aac') !== '';
  
  return `Browser support - MP3: ${canPlayMp3 ? 'Yes' : 'No'}, ` +
         `WAV: ${canPlayWav ? 'Yes' : 'No'}, ` +
         `OGG: ${canPlayOgg ? 'Yes' : 'No'}, ` +
         `AAC: ${canPlayAac ? 'Yes' : 'No'}`;
};
