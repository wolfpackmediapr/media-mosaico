
/**
 * Audio volume adapter utilities
 * Provides functions for converting between different volume representations
 */

/**
 * Ensures volume is in array format for UI components
 * @param volume Volume as number or number array
 * @returns Volume as number array
 */
export const ensureUiVolumeFormat = (volume: number | number[]): number[] => {
  if (Array.isArray(volume)) {
    return volume;
  }
  // Convert to percentage for UI (0-100 range)
  return [volume * 100];
};

/**
 * Converts UI volume (0-100) to audio element volume (0-1)
 * @param uiVolume Volume in UI format (0-100)
 * @returns Volume in audio element format (0-1)
 */
export const uiVolumeToAudioVolume = (uiVolume: number | number[]): number => {
  const volumeValue = Array.isArray(uiVolume) ? uiVolume[0] : uiVolume;
  return Math.max(0, Math.min(1, volumeValue / 100));
};

/**
 * Converts audio element volume (0-1) to UI volume (0-100)
 * @param audioVolume Volume in audio element format (0-1)
 * @returns Volume in UI format (0-100)
 */
export const audioVolumeToUiVolume = (audioVolume: number): number[] => {
  return [Math.max(0, Math.min(100, audioVolume * 100))];
};

/**
 * Adapts volume change from UI to audio element
 * @param volumeChange Function that changes audio element volume
 * @returns Function that accepts UI volume and converts it
 */
export const adaptVolumeChangeHandler = (
  volumeChange: (volume: number) => void
): (volume: number[]) => void => {
  return (uiVolume: number[]) => {
    volumeChange(uiVolumeToAudioVolume(uiVolume));
  };
};
