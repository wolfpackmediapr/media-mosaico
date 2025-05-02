
import { UtteranceTimestamp } from "@/services/audio/transcriptionService";

/**
 * Find the utterance that corresponds to the current playback time
 */
export const calculateCurrentSegment = (
  utterances: UtteranceTimestamp[],
  currentTime: number
): UtteranceTimestamp | null => {
  if (!utterances || utterances.length === 0 || !isFinite(currentTime)) {
    return null;
  }

  // Safety check for invalid time values
  if (currentTime < 0 || currentTime > 24 * 60 * 60) { // Max 24 hours
    console.warn(`[calculateCurrentSegment] Possibly invalid time value: ${currentTime}`);
    return null;
  }

  try {
    // Find the utterance where currentTime falls between start and end times
    return utterances.find(
      (utterance) => 
        currentTime >= utterance.start && 
        currentTime <= (utterance.end || utterance.start + 30)
    ) || null;
  } catch (error) {
    console.error("[calculateCurrentSegment] Error finding current segment:", error);
    return null;
  }
};

/**
 * Format timestamp in seconds to MM:SS format
 */
export const formatTimestamp = (timestamp: number): string => {
  if (!isFinite(timestamp) || timestamp < 0) {
    return "00:00";
  }
  
  try {
    const minutes = Math.floor(timestamp / 60);
    const seconds = Math.floor(timestamp % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  } catch (error) {
    console.error("[formatTimestamp] Error formatting timestamp:", error);
    return "00:00";
  }
};

/**
 * Get unique speakers from utterances
 */
export const getUniqueSpeakers = (utterances: UtteranceTimestamp[]): string[] => {
  if (!utterances || utterances.length === 0) {
    return [];
  }
  
  try {
    const speakers = utterances
      .map(utterance => utterance.speaker)
      .filter((speaker): speaker is string => !!speaker);
      
    return [...new Set(speakers)];
  } catch (error) {
    console.error("[getUniqueSpeakers] Error getting unique speakers:", error);
    return [];
  }
};
