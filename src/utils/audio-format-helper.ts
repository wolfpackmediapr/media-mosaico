
/**
 * Attempts to unlock audio context on iOS and other mobile browsers
 * This needs to be called on a user interaction like click/touch
 * to allow audio to play without restrictions
 */
export const unmuteAudio = (): void => {
  try {
    // Create a temporary audio context
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;

    // Create an audio context
    const audioCtx = new AudioContext();

    // Create a short silent sound
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    gainNode.gain.value = 0; // silent
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    // Play and stop the silent sound immediately
    oscillator.start(0);
    oscillator.stop(0.1);

    // Check if context is in suspended state (iOS)
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().then(() => {
        console.log('[audio-helper] Audio context unlocked successfully');
      }).catch(err => {
        console.warn('[audio-helper] Could not unlock audio context:', err);
      });
    }
  } catch (err) {
    console.warn('[audio-helper] Error attempting to unlock audio:', err);
  }
};

/**
 * Check if the current browser is Safari
 */
export const isSafari = (): boolean => {
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
};

/**
 * Check if device is iOS
 */
export const isIOS = (): boolean => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

/**
 * Check if current environment likely needs audio unlocking
 */
export const needsAudioUnlocking = (): boolean => {
  return isIOS() || isSafari();
};
