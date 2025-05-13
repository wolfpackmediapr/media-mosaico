
/**
 * Audio format helper utilities
 * Re-exports from the new modular structure for backward compatibility
 */

// Re-export all relevant functions from the new modules
import { 
  getMimeTypeFromFile,
  getAudioFormatDetails,
  isFormatSupported 
} from './audio/audio-format-detection';

import {
  canBrowserPlayFile,
  testAudioPlayback,
  unmuteAudio
} from './audio/audio-playback-support';

import {
  createNativeAudioElement
} from './audio/audio-element-factory';

// Export for backward compatibility
export {
  getMimeTypeFromFile,
  getAudioFormatDetails,
  isFormatSupported,
  canBrowserPlayFile,
  testAudioPlayback,
  unmuteAudio,
  createNativeAudioElement
};
