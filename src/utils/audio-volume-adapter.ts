import { VolumeValue } from '@/types/player';

/**
 * Convert any volume format to UI volume format (array of numbers 0-100)
 * @param volume Volume in any format (0-1, 0-100, or array)
 * @returns Volume as array of numbers 0-100
 */
export const ensureUiVolumeFormat = (volume: VolumeValue): number[] => {
  // If it's already an array, ensure values are in 0-100 range
  if (Array.isArray(volume)) {
    return volume.map(v => {
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
    // If value appears to be in 0-1 range, convert to 0-100
    if (volume >= 0 && volume <= 1) {
      return [Math.round(volume * 100)];
    }
    // Otherwise assume it's already in 0-100 range
    return [Math.max(0, Math.min(100, Math.round(volume)))];
  }
  
  // Default fallback
  return [50];
};

/**
 * Convert UI volume format to audio volume format (single number 0-1)
 * @param volume Volume as array of numbers 0-100 or single number
 * @returns Volume as single number 0-1
 */
export const uiVolumeToAudioVolume = (volume: VolumeValue): number => {
  if (Array.isArray(volume) && volume.length > 0) {
    // Convert from 0-100 to 0-1
    return Math.max(0, Math.min(1, volume[0] / 100));
  }
  
  if (typeof volume === 'number') {
    // If already in 0-1 range, return as is
    if (volume >= 0 && volume <= 1) {
      return volume;
    }
    // Otherwise convert from 0-100 to 0-1
    return Math.max(0, Math.min(1, volume / 100));
  }
  
  // Default fallback
  return 0.5;
};

/**
 * Convert any volume format to audio system format (single number 0-1)
 * This is a convenience function that combines the two above
 */
export const ensureAudioVolumeFormat = (volume: VolumeValue): number => {
  return uiVolumeToAudioVolume(volume);
};
