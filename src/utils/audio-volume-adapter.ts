
import { VolumeValue } from '@/types/player';

/**
 * Convert any volume format to UI volume format (array of numbers 0-100)
 * @param volume Volume in any format (0-1, 0-100, or array)
 * @returns Volume as array of numbers 0-100
 */
export const ensureUiVolumeFormat = (volume: VolumeValue): number[] => {
  // Handle null/undefined case
  if (volume === null || volume === undefined) {
    console.log('[audio-volume-adapter] Received null/undefined volume, using default');
    return [50]; // Default fallback
  }
  
  // If it's already an array, ensure values are in 0-100 range and valid
  if (Array.isArray(volume)) {
    // If array is empty, return default
    if (volume.length === 0) {
      console.log('[audio-volume-adapter] Received empty volume array, using default');
      return [50];
    }
    
    return volume.map(v => {
      // Check for invalid values
      if (v === null || v === undefined || !isFinite(v)) {
        console.log('[audio-volume-adapter] Found invalid volume value in array, using default');
        return 50; // Default for invalid values
      }
      
      // If value appears to be in 0-1 range, convert to 0-100
      if (v >= 0 && v <= 1) {
        return Math.round(v * 100);
      }
      // Otherwise assume it's already in 0-100 range
      return Math.max(0, Math.min(100, Math.round(v)));
    });
  }
  
  // For single number values
  if (typeof volume === 'number') {
    // Handle invalid values
    if (!isFinite(volume)) {
      console.log('[audio-volume-adapter] Received non-finite volume number, using default');
      return [50];
    }
    
    // If value appears to be in 0-1 range, convert to 0-100
    if (volume >= 0 && volume <= 1) {
      return [Math.round(volume * 100)];
    }
    // Otherwise assume it's already in 0-100 range
    return [Math.max(0, Math.min(100, Math.round(volume)))];
  }
  
  // Default fallback
  console.log('[audio-volume-adapter] Received unhandled volume format, using default');
  return [50];
};

/**
 * Convert UI volume format to audio volume format (single number 0-1)
 * @param volume Volume as array of numbers 0-100 or single number
 * @returns Volume as single number 0-1
 */
export const uiVolumeToAudioVolume = (volume: VolumeValue): number => {
  // Handle null/undefined case
  if (volume === null || volume === undefined) {
    console.log('[audio-volume-adapter] Received null/undefined volume for conversion, using default');
    return 0.5; // Default fallback
  }
  
  if (Array.isArray(volume) && volume.length > 0) {
    // Get first value and ensure it's valid
    const val = volume[0];
    if (!isFinite(val)) {
      console.log('[audio-volume-adapter] Array contains non-finite volume, using default');
      return 0.5;
    }
    
    // Convert from 0-100 to 0-1
    return Math.max(0, Math.min(1, val / 100));
  }
  
  if (typeof volume === 'number') {
    // Handle invalid values
    if (!isFinite(volume)) {
      console.log('[audio-volume-adapter] Number volume is non-finite, using default');
      return 0.5;
    }
    
    // If already in 0-1 range, return as is
    if (volume >= 0 && volume <= 1) {
      return volume;
    }
    // Otherwise convert from 0-100 to 0-1
    return Math.max(0, Math.min(1, volume / 100));
  }
  
  // Default fallback
  console.log('[audio-volume-adapter] Unhandled volume format for conversion, using default');
  return 0.5;
};

/**
 * Convert any volume format to audio system format (single number 0-1)
 * This is a convenience function that combines the two above
 */
export const ensureAudioVolumeFormat = (volume: VolumeValue): number => {
  return uiVolumeToAudioVolume(volume);
};
