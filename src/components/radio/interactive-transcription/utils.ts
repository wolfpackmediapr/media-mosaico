import { UtteranceTimestamp } from "@/services/audio/transcriptionService";

/**
 * Calculate which segment should be active based on the current playback time
 * 
 * @param utterances Array of utterances with timestamps
 * @param currentTime Current audio playback time in seconds
 * @returns The active utterance or null if none matches
 */
export const calculateCurrentSegment = (
  utterances: UtteranceTimestamp[],
  currentTime: number
): UtteranceTimestamp | null => {
  if (!utterances || utterances.length === 0) {
    console.log('[calculateCurrentSegment] No utterances available');
    return null;
  }

  // Make sure currentTime is in seconds
  let timeInSeconds = currentTime;
  
  // Log input for debugging
  console.log(`[calculateCurrentSegment] Finding segment at ${timeInSeconds.toFixed(2)}s in ${utterances.length} utterances`);
  
  // Find the utterance that contains the current time
  const currentUtterance = utterances.find(utterance => {
    // IMPROVED: Ensure utterance times are always converted to seconds
    // Most APIs return timestamps in milliseconds, but our player expects seconds
    const startInSeconds = normalizeTimeToSeconds(utterance.start);
    const endInSeconds = normalizeTimeToSeconds(utterance.end);
    
    // Check if current time falls within this utterance's range
    const isWithinRange = timeInSeconds >= startInSeconds && timeInSeconds <= endInSeconds;
    
    if (isWithinRange) {
      console.log(`[calculateCurrentSegment] Found segment: ${startInSeconds.toFixed(2)}s to ${endInSeconds.toFixed(2)}s`);
    }
    
    return isWithinRange;
  });

  if (currentUtterance) {
    return currentUtterance;
  }

  // If we didn't find a direct match, find the closest upcoming utterance
  // This helps when we're in a gap between utterances
  const upcomingUtterances = utterances
    .filter(utterance => {
      const startInSeconds = normalizeTimeToSeconds(utterance.start);
      return startInSeconds > timeInSeconds;
    })
    .sort((a, b) => {
      const aStart = normalizeTimeToSeconds(a.start);
      const bStart = normalizeTimeToSeconds(b.start);
      return aStart - bStart;
    });

  if (upcomingUtterances.length > 0) {
    const nextUtterance = upcomingUtterances[0];
    const startInSeconds = normalizeTimeToSeconds(nextUtterance.start);
    
    // If the next utterance is very close (within 1 second), consider it current
    if (startInSeconds - timeInSeconds < 1.0) {
      console.log(`[calculateCurrentSegment] Using upcoming segment starting at ${startInSeconds.toFixed(2)}s (in ${(startInSeconds - timeInSeconds).toFixed(2)}s)`);
      return nextUtterance;
    }
  }

  // If no current or upcoming utterance is found, find the most recent past utterance
  const pastUtterances = utterances
    .filter(utterance => {
      const endInSeconds = normalizeTimeToSeconds(utterance.end);
      return endInSeconds < timeInSeconds;
    })
    .sort((a, b) => {
      const aEnd = normalizeTimeToSeconds(a.end);
      const bEnd = normalizeTimeToSeconds(b.end);
      return bEnd - aEnd; // Sort descending to get the most recent
    });

  if (pastUtterances.length > 0) {
    const lastUtterance = pastUtterances[0];
    const endInSeconds = normalizeTimeToSeconds(lastUtterance.end);
    
    // If the last utterance ended very recently (within 2 seconds), consider it current
    if (timeInSeconds - endInSeconds < 2.0) {
      console.log(`[calculateCurrentSegment] Using recent past segment ending at ${endInSeconds.toFixed(2)}s (${(timeInSeconds - endInSeconds).toFixed(2)}s ago)`);
      return lastUtterance;
    }
  }

  console.log(`[calculateCurrentSegment] No suitable segment found at ${timeInSeconds.toFixed(2)}s`);
  return null;
};

/**
 * Normalize a timestamp to seconds, detecting if it's in milliseconds
 * 
 * @param time Timestamp which could be in seconds or milliseconds
 * @returns Time in seconds
 */
export const normalizeTimeToSeconds = (time: number): number => {
  // First, validate the input is actually a number
  if (typeof time !== 'number' || !isFinite(time)) {
    console.error(`[normalizeTimeToSeconds] Invalid time value: ${time}, returning 0`);
    return 0;
  }
  
  // If time is over 1000, assume it's in milliseconds and convert to seconds
  if (time > 1000) {
    const seconds = time / 1000;
    console.log(`[normalizeTimeToSeconds] Converting ${time}ms to ${seconds.toFixed(2)}s`);
    return seconds;
  }
  
  // Otherwise assume it's already in seconds
  console.log(`[normalizeTimeToSeconds] Time already in seconds: ${time.toFixed(2)}s`);
  return time;
};

/**
 * Generate a consistent color for a specific speaker
 * 
 * @param speaker Speaker identifier (string or number)
 * @returns CSS color string
 */
export const getSpeakerColor = (speaker: string | number): string => {
  // Convert speaker to string to handle both numeric and string IDs
  const speakerId = String(speaker);
  
  // Extract numeric portion if in format "speaker_1" or similar
  const numericPart = speakerId.includes('_') ? 
    parseInt(speakerId.split('_')[1], 10) : 
    parseInt(speakerId, 10);
  
  // Use a fixed color palette for common speakers
  const colorPalette = [
    "#4C72B0", // blue
    "#DD8452", // orange
    "#55A868", // green
    "#C44E52", // red
    "#8172B3", // purple
    "#937860", // brown
    "#DA8BC3", // pink
    "#8C8C8C", // gray
    "#CCB974", // yellow
    "#64B5CD"  // light blue
  ];
  
  // If we have a valid numeric ID, use it to pick from the palette
  if (!isNaN(numericPart)) {
    // Make sure we wrap around if we have more speakers than colors
    return colorPalette[numericPart % colorPalette.length];
  }
  
  // If we couldn't parse a number, use string hashing for consistent color
  let hash = 0;
  for (let i = 0; i < speakerId.length; i++) {
    hash = speakerId.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Convert hash to RGB color
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 50%)`;
};
