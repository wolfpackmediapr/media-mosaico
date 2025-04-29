
import { UtteranceTimestamp } from "@/services/audio/transcriptionService";

// Define a set of colors for speakers
const SPEAKER_COLORS = [
  "#9b87f5", // Primary Purple
  "#7E69AB", // Secondary Purple
  "#F97316", // Bright Orange
  "#0EA5E9", // Ocean Blue
  "#D946EF", // Magenta Pink
  "#ea384c", // Red
  "#33C3F0", // Sky Blue
  "#1EAEDB", // Bright Blue
];

/**
 * Get a consistent color for a speaker
 */
export const getSpeakerColor = (speakerId: string | number): string => {
  // Extract numeric part if speaker comes as "speaker_1" format
  const normalizedId = typeof speakerId === 'string' && speakerId.includes('_') 
    ? parseInt(speakerId.split('_')[1]) 
    : typeof speakerId === 'number' 
      ? speakerId 
      : parseInt(speakerId);
  
  // Use modulo to cycle through available colors
  const colorIndex = (normalizedId - 1) % SPEAKER_COLORS.length;
  return SPEAKER_COLORS[colorIndex];
};

/**
 * Calculate which segment is currently playing based on current time
 */
export const calculateCurrentSegment = (
  utterances: UtteranceTimestamp[],
  currentTime: number
): UtteranceTimestamp | null => {
  // Check if currentTime is in milliseconds and convert to seconds if needed
  const currentTimeInSeconds = currentTime > 1000 ? currentTime / 1000 : currentTime;
  
  // Find the segment that contains the current time
  const currentSegment = utterances.find(
    (utterance) => {
      // Convert utterance timestamps to seconds if needed (AssemblyAI uses milliseconds)
      const start = utterance.start > 1000 ? utterance.start / 1000 : utterance.start;
      const end = utterance.end > 1000 ? utterance.end / 1000 : utterance.end;
      
      return currentTimeInSeconds >= start && currentTimeInSeconds <= end;
    }
  );

  return currentSegment || null;
};
