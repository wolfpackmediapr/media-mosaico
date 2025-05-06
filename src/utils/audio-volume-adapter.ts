
/**
 * Audio Volume Adapter Utilities
 * 
 * This module provides utilities for converting between different volume formats:
 * - UI components typically use number[] with values 0-100
 * - Audio core (Howler) uses a single number with values 0-1
 */

/**
 * Converts a UI volume array [0-100] to an audio engine volume number (0-1)
 */
export const uiVolumeToAudioVolume = (uiVolume: number[]): number => {
  if (!Array.isArray(uiVolume) || uiVolume.length === 0) {
    console.warn('[audio-volume-adapter] Invalid UI volume format provided, using default 0');
    return 0;
  }
  
  // Convert 0-100 scale to 0-1 scale
  const normalizedVolume = uiVolume[0] / 100;
  
  // Ensure the volume is within valid range
  return Math.max(0, Math.min(1, normalizedVolume));
};

/**
 * Converts an audio engine volume (0-1) to a UI volume array [0-100]
 */
export const audioVolumeToUiVolume = (audioVolume: number): number[] => {
  // Ensure the input is a valid number
  if (typeof audioVolume !== 'number' || isNaN(audioVolume)) {
    console.warn('[audio-volume-adapter] Invalid audio volume format provided, using default 0');
    return [0];
  }
  
  // Convert 0-1 scale to 0-100 scale and ensure valid range
  const uiVolume = Math.round(Math.max(0, Math.min(1, audioVolume)) * 100);
  
  return [uiVolume];
};

/**
 * Type guard to check if a volume value is in UI format (array)
 */
export const isUiVolumeFormat = (volume: unknown): volume is number[] => {
  return Array.isArray(volume);
};

/**
 * Type guard to check if a volume value is in audio engine format (number)
 */
export const isAudioVolumeFormat = (volume: unknown): volume is number => {
  return typeof volume === 'number';
};

/**
 * Ensures volume is in audio engine format (0-1)
 * Accepts either UI format (number[]) or audio format (number)
 */
export const ensureAudioVolumeFormat = (volume: number | number[]): number => {
  // Handle null or undefined
  if (volume === null || volume === undefined) {
    console.warn('[audio-volume-adapter] Null/undefined volume provided, using default 0');
    return 0;
  }
  
  if (isUiVolumeFormat(volume)) {
    return uiVolumeToAudioVolume(volume);
  }
  
  // If already a number, just clamp to 0-1
  if (isAudioVolumeFormat(volume)) {
    return Math.max(0, Math.min(1, volume));
  }
  
  // If we get here, we have an invalid type - use safe default
  console.warn('[audio-volume-adapter] Invalid volume format provided, using default 0');
  return 0;
};

/**
 * Ensures volume is in UI format (array [0-100])
 * Accepts either UI format (number[]) or audio format (number)
 */
export const ensureUiVolumeFormat = (volume: number | number[]): number[] => {
  // Handle null or undefined
  if (volume === null || volume === undefined) {
    console.warn('[audio-volume-adapter] Null/undefined volume provided, using default 0');
    return [0];
  }
  
  if (isAudioVolumeFormat(volume)) {
    return audioVolumeToUiVolume(volume);
  }
  
  // If already an array, ensure values are clamped
  if (Array.isArray(volume)) {
    if (volume.length === 0) {
      console.warn('[audio-volume-adapter] Empty volume array provided, using default 0');
      return [0];
    }
    
    // Handle NaN or invalid values
    if (typeof volume[0] !== 'number' || isNaN(volume[0])) {
      console.warn('[audio-volume-adapter] Invalid volume value in array, using default 0');
      return [0];
    }
    
    return [Math.max(0, Math.min(100, volume[0]))];
  }
  
  // If we get here, we have an invalid type - use safe default
  console.warn('[audio-volume-adapter] Invalid volume format provided, using default 0');
  return [0];
};
