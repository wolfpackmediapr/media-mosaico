
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
    const segment = utterances.find(
      (utterance) => 
        currentTime >= utterance.start && 
        currentTime <= (utterance.end || utterance.start + 30)
    ) || null;
    
    // Add more detailed debug logging when segments change
    if (segment) {
      console.debug(`[calculateCurrentSegment] Found segment at time ${currentTime}s: ${segment.start}s-${segment.end}s`);
    }
    
    return segment;
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

/**
 * Generate a consistent color for a speaker based on their ID
 */
export const getSpeakerColor = (speakerId: string | number | undefined): string => {
  if (!speakerId) {
    return "#6b7280"; // Default gray color
  }
  
  // Convert speaker ID to string
  const speakerStr = String(speakerId);
  
  // Pre-defined colors for better readability and contrast
  const colors = [
    "#3b82f6", // blue
    "#ef4444", // red
    "#10b981", // green
    "#f59e0b", // amber
    "#8b5cf6", // purple
    "#ec4899", // pink
    "#14b8a6", // teal
    "#f97316", // orange
    "#6366f1", // indigo
    "#a855f7"  // violet
  ];
  
  // Generate a consistent index based on the speaker string
  let hash = 0;
  for (let i = 0; i < speakerStr.length; i++) {
    hash = ((hash << 5) - hash) + speakerStr.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Get a positive index within the colors array length
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};
