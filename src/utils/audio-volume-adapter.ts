
/**
 * Audio volume format adapter utilities
 * Manages conversions between different volume formats (sliders, native audio, etc.)
 */

/**
 * Ensures volume is in the correct format for UI components like sliders
 * Converts single number 0-1 to array [0-100]
 * @param volume Volume value (single number 0-1 or array [0-100])
 * @returns Properly formatted volume array [0-100]
 */
export const ensureUiVolumeFormat = (volume: number | number[]): number[] => {
  if (Array.isArray(volume)) {
    return volume.map(v => Math.min(100, Math.max(0, v)));
  }
  
  // Convert 0-1 scale to 0-100 scale
  return [Math.min(100, Math.max(0, volume * 100))];
};

/**
 * Ensures volume is in the correct format for audio elements (0-1 range)
 * @param volume Volume value (single number 0-1 or array [0-100])
 * @returns Single volume number in 0-1 range
 */
export const ensureAudioVolumeFormat = (volume: number | number[]): number => {
  if (Array.isArray(volume)) {
    // Get first item from array and convert from 0-100 to 0-1
    return Math.min(1, Math.max(0, volume[0] / 100));
  }
  
  // Ensure the value is in range 0-1
  return Math.min(1, Math.max(0, volume));
};

/**
 * Converts UI slider volume (0-100) to audio volume (0-1)
 * @param uiVolume Volume in UI format (0-100)
 * @returns Volume in audio format (0-1)
 */
export const uiVolumeToAudioVolume = (uiVolume: number[]): number => {
  return Math.min(1, Math.max(0, uiVolume[0] / 100));
};

/**
 * Converts audio volume (0-1) to UI slider volume (0-100)
 * @param audioVolume Volume in audio format (0-1)
 * @returns Volume in UI format as array [0-100]
 */
export const audioVolumeToUiVolume = (audioVolume: number): number[] => {
  return [Math.min(100, Math.max(0, audioVolume * 100))];
};
