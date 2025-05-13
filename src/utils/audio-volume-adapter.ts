
/**
 * Ensures volume is in the UI-compatible format (slider array)
 * Different components expect volume in different formats:
 * - Native playback: 0.0-1.0 scalar
 * - Slider UI components: [0-100] array
 * 
 * @param volume Volume value in any format
 * @returns Volume in slider-compatible format [0-100]
 */
export const ensureUiVolumeFormat = (volume: number | number[]): number[] => {
  if (Array.isArray(volume)) {
    return volume;
  }
  
  // If it's a scalar 0-1 value, convert to 0-100 for UI
  if (volume <= 1) {
    return [volume * 100];
  }
  
  // If it's already a 0-100 value, wrap in array
  return [volume];
};

/**
 * Converts UI volume to scalar format for audio APIs
 * 
 * @param volume Volume in UI format [0-100]
 * @returns Volume as scalar 0.0-1.0
 */
export const uiVolumeToScalar = (volume: number | number[]): number => {
  const val = Array.isArray(volume) ? volume[0] : volume;
  
  // If already in 0-1 range
  if (val <= 1) {
    return val;
  }
  
  // Convert from 0-100 to 0-1
  return val / 100;
};
