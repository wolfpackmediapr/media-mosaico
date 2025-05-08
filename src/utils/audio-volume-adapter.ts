/**
 * Utilities for handling volume format conversions between UI formats and audio engine formats
 */

/**
 * Converts UI volume (0-100 range) to audio engine volume (0-1 range)
 */
export const uiVolumeToAudioVolume = (value: number | number[]): number => {
  try {
    // Handle array format
    if (Array.isArray(value)) {
      if (value.length === 0 || !isFinite(value[0])) return 0.5; // Default to 50% if invalid
      return Math.max(0, Math.min(100, value[0])) / 100;
    }
    
    // Handle number format
    if (typeof value === 'number' && isFinite(value)) {
      // If value is already between 0-1, assume it's already in audio volume format
      if (value >= 0 && value <= 1) return value;
      
      // Otherwise convert from 0-100 range to 0-1
      return Math.max(0, Math.min(100, value)) / 100;
    }
    
    // Default fallback
    console.warn('[audio-volume-adapter] Invalid volume value, using default:', value);
    return 0.5;
  } catch (error) {
    console.error('[audio-volume-adapter] Error converting volume:', error);
    return 0.5; // Default to 50% volume on error
  }
};

/**
 * Converts audio engine volume (0-1 range) to UI volume (0-100 range array)
 */
export const audioVolumeToUiVolume = (value: number): number[] => {
  try {
    if (typeof value !== 'number' || !isFinite(value)) {
      console.warn('[audio-volume-adapter] Invalid audio volume, using default:', value);
      return [50]; // Default to 50%
    }
    
    // If value is already greater than 1, assume it's already in UI format
    if (value > 1) return [Math.max(0, Math.min(100, value))];
    
    // Convert 0-1 to 0-100 range
    return [Math.round(value * 100)];
  } catch (error) {
    console.error('[audio-volume-adapter] Error converting audio volume:', error);
    return [50]; // Default to 50% volume on error
  }
};

/**
 * Ensures volume is in UI format (array of numbers where 0-100)
 */
export const ensureUiVolumeFormat = (value: any): number[] => {
  try {
    // Already in correct format
    if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'number' && isFinite(value[0])) {
      // Ensure values are within 0-100 range
      return value.map(v => Math.max(0, Math.min(100, v)));
    }
    
    // Convert number to array
    if (typeof value === 'number' && isFinite(value)) {
      // If already in 0-100 range
      if (value > 1) return [Math.max(0, Math.min(100, value))];
      
      // If in 0-1 range (audio engine format)
      return [Math.round(value * 100)];
    }
    
    // Default fallback
    console.warn('[audio-volume-adapter] Could not convert volume to UI format:', value);
    return [50];
  } catch (error) {
    console.error('[audio-volume-adapter] Error ensuring UI volume format:', error);
    return [50]; // Default to 50% on error
  }
};
