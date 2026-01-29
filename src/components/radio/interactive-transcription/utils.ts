
import { UtteranceTimestamp } from "@/services/audio/transcriptionService";

/**
 * Generate a consistent color for a speaker based on their ID
 */
export const getSpeakerColor = (speakerId: string | number): string => {
  // Convert speaker ID to a number for hue calculation
  let numericId: number;
  
  if (typeof speakerId === 'string') {
    const parts = speakerId.split('_');
    numericId = parts.length > 1 ? parseInt(parts[1], 10) : speakerId.charCodeAt(0);
  } else {
    numericId = speakerId;
  }
  
  // Use the numeric ID to generate a hue value (0-360)
  // Multiply by 137.5 (phi * 100) to get a good distribution
  const hue = (numericId * 137.5) % 360;
  
  // Use a consistent saturation and lightness for all speakers
  return `hsl(${hue}, 70%, 50%)`;
};

/**
 * Normalize timestamp to seconds consistently
 */
export const normalizeTimeToSeconds = (time: number): number => {
  // If time is clearly in milliseconds (> 10 hours worth of seconds = 36000),
  // then convert to seconds. This handles the edge case where values between
  // 60-1000 could be either seconds (for long videos) or milliseconds.
  if (time > 36000) {
    return time / 1000;
  }
  return time;
};

/**
 * Get a unique list of speakers from utterances
 */
export const getUniqueSpeakers = (utterances: UtteranceTimestamp[]): (string | number)[] => {
  if (!utterances || utterances.length === 0) return [];
  return Array.from(new Set(utterances.map(u => u.speaker))).sort();
};

/**
 * Format speaker name for display
 */
export const formatSpeakerName = (speakerId: string | number): string => {
  if (typeof speakerId === 'string') {
    return speakerId.includes('_') ? 
      `Speaker ${speakerId.split('_')[1]}` : 
      `Speaker ${speakerId}`;
  }
  return `Speaker ${speakerId}`;
};

/**
 * Find the active segment based on current time
 */
export const calculateCurrentSegment = (
  utterances: UtteranceTimestamp[], 
  currentTime: number
): UtteranceTimestamp | null => {
  if (!utterances || utterances.length === 0) return null;
  
  // Ensure time is in seconds for consistent comparison
  const timeInSeconds = normalizeTimeToSeconds(currentTime);
  
  // Find the utterance that contains the current time
  for (const utterance of utterances) {
    const start = normalizeTimeToSeconds(utterance.start);
    const end = normalizeTimeToSeconds(utterance.end);
    
    if (timeInSeconds >= start && timeInSeconds <= end) {
      return utterance;
    }
  }
  
  return null;
};
